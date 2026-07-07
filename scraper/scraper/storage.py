import hashlib
import io
import logging
import os
import re
import urllib.parse
from datetime import datetime

import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageFilter

logger = logging.getLogger(__name__)

_USER_AGENT = "AfrikaHaberleriBot/1.0 (+https://github.com/TuanaKardil/afrika_website)"
_REQUEST_TIMEOUT = 15
_BUCKET = "article-images"
_MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB


def _get_supabase():
    from supabase import create_client
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


def _storage_path(source: str, published_at: datetime, article_id: str, filename: str) -> str:
    safe_name = re.sub(r"[^\w.\-]", "_", filename)
    return f"{source}/{published_at.year}/{published_at.month:02d}/{article_id}/{safe_name}"


def _remove_bbc_watermark(img: Image.Image) -> Image.Image:
    """Remove BBC watermark by cloning the region just above it downward."""
    w, h = img.size
    wm_w = int(w * 0.32)
    wm_h = int(h * 0.14)
    top = h - wm_h

    # Clone the strip just above the watermark and paste it over the watermark area
    source = img.crop((0, top - wm_h, wm_w, top))
    source_resized = source.resize((wm_w, wm_h), Image.LANCZOS)
    img.paste(source_resized, (0, top))

    # Blend the seam with a narrow blur strip
    seam_box = (0, top - 6, wm_w + 6, top + 10)
    seam = img.crop(seam_box)
    img.paste(seam.filter(ImageFilter.GaussianBlur(radius=5)), seam_box)

    return img


_MAX_IMAGE_WIDTH = 1200
# Responsive WebP ladder. Variants are generated only at widths <= the source
# width (never upscaled), so a small source simply yields fewer rungs.
_VARIANT_TARGETS = (400, 800, 1200)
_WEBP_QUALITY = 80


def _process_image(raw_bytes: bytes, source: str = "") -> Image.Image:
    """Decode, de-watermark (bbc) and cap to _MAX_IMAGE_WIDTH. RGB image."""
    buf = io.BytesIO(raw_bytes)
    img = Image.open(buf).convert("RGB")
    if source == "bbc":
        img = _remove_bbc_watermark(img)
    if img.width > _MAX_IMAGE_WIDTH:
        new_height = int(img.height * _MAX_IMAGE_WIDTH / img.width)
        img = img.resize((_MAX_IMAGE_WIDTH, new_height), Image.LANCZOS)
    return img


def _jpeg_bytes(img: Image.Image) -> bytes:
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=80, optimize=True)
    return out.getvalue()


def _to_jpeg_bytes(raw_bytes: bytes, source: str = "") -> bytes:
    return _jpeg_bytes(_process_image(raw_bytes, source))


def _variant_widths(src_width: int) -> list[int]:
    """Ladder rungs <= source width, always including the (capped) source width."""
    widths = {w for w in _VARIANT_TARGETS if w < src_width}
    widths.add(min(src_width, _MAX_IMAGE_WIDTH))
    return sorted(widths)


def _webp_bytes(img: Image.Image, width: int) -> bytes:
    if width < img.width:
        height = max(1, round(img.height * width / img.width))
        img = img.resize((width, height), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, format="WEBP", quality=_WEBP_QUALITY, method=6)
    return out.getvalue()


def _download_image(url: str) -> tuple[bytes, str] | None:
    """Download image bytes and return (bytes, original_filename). Returns None on failure."""
    try:
        resp = requests.get(
            url,
            headers={"User-Agent": _USER_AGENT},
            timeout=_REQUEST_TIMEOUT,
            stream=True,
        )
        resp.raise_for_status()

        content_type = resp.headers.get("content-type", "")
        if not content_type.startswith("image/"):
            logger.warning("Non-image content-type '%s' for %s", content_type, url)
            return None

        raw = b"".join(resp.iter_content(chunk_size=8192))
        if len(raw) > _MAX_IMAGE_BYTES:
            logger.warning("Image too large (%d bytes) for %s", len(raw), url)
            return None

        filename = urllib.parse.urlparse(url).path.rstrip("/").split("/")[-1] or "image.jpg"
        return raw, filename

    except Exception as exc:
        logger.warning("Failed to download image %s: %s", url, exc)
        return None


def upload_image(
    image_url: str,
    article_id: str,
    source: str,
    published_at: datetime,
) -> str | None:
    """Download image, normalize to JPEG, upload to Supabase Storage.
    Returns public URL or None on any failure."""
    if not image_url:
        return None

    result = _download_image(image_url)
    if result is None:
        return None

    raw_bytes, filename = result
    stem = re.sub(r"\.[^.]+$", "", filename) or "image"
    jpeg_filename = f"{stem}.jpg"

    try:
        jpeg_bytes = _to_jpeg_bytes(raw_bytes, source)
    except Exception as exc:
        logger.warning("Failed to convert image to JPEG for %s: %s", image_url, exc)
        return None

    path = _storage_path(source, published_at, article_id, jpeg_filename)

    try:
        sb = _get_supabase()
        sb.storage.from_(_BUCKET).upload(
            path,
            jpeg_bytes,
            {"content-type": "image/jpeg", "upsert": "true", "cache-control": "public, max-age=31536000, immutable"},
        )
        public_url = f"{os.environ['SUPABASE_URL']}/storage/v1/object/public/{_BUCKET}/{path}"
        return public_url
    except Exception as exc:
        logger.error("Failed to upload image to Storage (path=%s): %s", path, exc)
        return None


def _public_url(path: str) -> str:
    return f"{os.environ['SUPABASE_URL']}/storage/v1/object/public/{_BUCKET}/{path}"


def upload_featured_image(
    image_url: str,
    article_id: str,
    source: str,
    published_at: datetime,
) -> tuple[str | None, str | None]:
    """Like upload_image, but also generates responsive WebP variants.

    Returns (jpeg_public_url, webp_srcset). The JPEG stays the src fallback;
    the srcset string ("<url> 400w, <url> 800w, ...") is stored in
    articles.image_srcset. Either element is None on the relevant failure;
    a WebP failure never blocks the JPEG upload.
    """
    if not image_url:
        return None, None

    result = _download_image(image_url)
    if result is None:
        return None, None

    raw_bytes, filename = result
    stem = re.sub(r"\.[^.]+$", "", filename) or "image"

    try:
        img = _process_image(raw_bytes, source)
        jpeg_bytes = _jpeg_bytes(img)
    except Exception as exc:
        logger.warning("Failed to process image for %s: %s", image_url, exc)
        return None, None

    sb = _get_supabase()

    jpeg_path = _storage_path(source, published_at, article_id, f"{stem}.jpg")
    try:
        sb.storage.from_(_BUCKET).upload(
            jpeg_path,
            jpeg_bytes,
            {"content-type": "image/jpeg", "upsert": "true", "cache-control": "public, max-age=31536000, immutable"},
        )
    except Exception as exc:
        logger.error("Failed to upload JPEG to Storage (path=%s): %s", jpeg_path, exc)
        return None, None

    jpeg_url = _public_url(jpeg_path)

    # Responsive WebP variants (best-effort; never blocks the JPEG result).
    srcset_entries: list[str] = []
    try:
        for width in _variant_widths(img.width):
            webp_path = _storage_path(source, published_at, article_id, f"{stem}-{width}.webp")
            sb.storage.from_(_BUCKET).upload(
                webp_path,
                _webp_bytes(img, width),
                {"content-type": "image/webp", "upsert": "true", "cache-control": "public, max-age=31536000, immutable"},
            )
            srcset_entries.append(f"{_public_url(webp_path)} {width}w")
    except Exception as exc:
        logger.warning("WebP variant generation failed for %s: %s", image_url, exc)
        srcset_entries = []

    srcset = ", ".join(srcset_entries) if srcset_entries else None
    return jpeg_url, srcset


def _image_fingerprint(img_bytes: bytes) -> str:
    """16x16 grayscale perceptual fingerprint — catches same-image-different-filename."""
    try:
        buf = io.BytesIO(img_bytes)
        img = Image.open(buf).convert("L").resize((16, 16), Image.LANCZOS)
        return hashlib.md5(img.tobytes()).hexdigest()
    except Exception:
        return ""


def compute_image_fingerprint(url: str) -> str:
    """Download image at url and return its perceptual fingerprint. Empty string on failure."""
    result = _download_image(url)
    if result is None:
        return ""
    return _image_fingerprint(result[0])


def rewrite_image_srcs(html: str, url_map: dict[str, str]) -> str:
    """Replace original img src values with Supabase Storage URLs."""
    if not url_map:
        return html
    soup = BeautifulSoup(html, "lxml")
    for img in soup.find_all("img"):
        src = img.get("src", "")
        if src in url_map:
            img["src"] = url_map[src]
    return str(soup)
