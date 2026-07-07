const INDEXNOW_KEY = "b821579c4bc8450dab6f8ec6bd0f0fc4";
const INDEXNOW_HOST = "www.afrikahaberleri.tr";
const SITE_URL = "https://www.afrikahaberleri.tr";

/**
 * Notify IndexNow that URLs were added or changed.
 *
 * IndexNow (api.indexnow.org) fans out to Bing, Yandex, Seznam and Naver. The
 * scraper already pings newly inserted articles (scraper/scraper/pipelines.py);
 * this is the frontend counterpart so admin-edited articles and published blog
 * posts are announced too. Fire-and-forget: it never throws and its result is
 * ignored so it can't break an admin save.
 *
 * Google does NOT consume IndexNow for news, and the Google Indexing API is
 * limited to JobPosting/Livestream, so it must not be used here — Google
 * discovery is handled by the news-sitemap and RSS feed instead.
 *
 * @param paths absolute URLs or site-relative paths (e.g. "/haber/slug").
 */
export async function pingIndexNow(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const urlList = paths.map((p) => (p.startsWith("http") ? p : `${SITE_URL}${p}`));
  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    });
  } catch {
    // Best-effort notification; ignore network/endpoint errors.
  }
}
