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


def _blur_bbc_watermark(img: Image.Image) -> Image.Image:
    """Blur the bottom-left corner where BBC places its watermark on branded images."""
    w, h = img.size
    wm_w = int(w * 0.22)
    wm_h = int(h * 0.10)
    box = (0, h - wm_h, wm_w, h)
    region = img.crop(box)
    blurred = region.filter(ImageFilter.GaussianBlur(radius=18))
    img.paste(blurred, box)
    return img


def _to_jpeg_bytes(raw_bytes: bytes, source: str = "") -> bytes:
    buf = io.BytesIO(raw_bytes)
    img = Image.open(buf).convert("RGB")
    if source == "bbc":
        img = _blur_bbc_watermark(img)
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=85, optimize=True)
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
            {"content-type": "image/jpeg", "upsert": "true"},
        )
        public_url = f"{os.environ['SUPABASE_URL']}/storage/v1/object/public/{_BUCKET}/{path}"
        return public_url
    except Exception as exc:
        logger.error("Failed to upload image to Storage (path=%s): %s", path, exc)
        return None


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
