import os
from dotenv import load_dotenv

load_dotenv()

BOT_NAME = "AfrikaHaberleriBot"

SPIDER_MODULES = ["scraper.spiders"]
NEWSPIDER_MODULE = "scraper.spiders"

USER_AGENT = "AfrikaHaberleriBot/1.0 (+https://github.com/TuanaKardil/afrika_website)"

ROBOTSTXT_OBEY = True

DOWNLOAD_DELAY = 2
CONCURRENT_REQUESTS_PER_DOMAIN = 2
CONCURRENT_REQUESTS = 16

COOKIES_ENABLED = False

ITEM_PIPELINES = {
    "scraper.pipelines.DeduplicationPipeline": 100,     # Hash + AI semantic dedup (48h)
    "scraper.pipelines.TurkeyFilterPipeline": 150,       # GPT-5 Nano: PASS/SUPPRESS
    "scraper.pipelines.ScorePipeline": 160,              # Gemini Flash-Lite: 1-10 score
    "scraper.pipelines.MinContentPipeline": 175,         # Drop stub/paywalled articles (< 80 words)
    "scraper.pipelines.TranslationPipeline": 200,        # Gemini Flash-Lite: TR translate (score 5+)
    "scraper.pipelines.ContentCleanPipeline": 220,       # Gemini Flash-Lite: remove boilerplate from content_tr
    "scraper.pipelines.QualityCheckPipeline": 235,       # Drop truncated lists; warn on missing H2
    "scraper.pipelines.SanitizationPipeline": 250,       # HTML sanitize (after translate)
    "scraper.pipelines.StoragePipeline": 300,            # classify + hashtags + images + DB write
}

REQUEST_FINGERPRINTER_IMPLEMENTATION = "2.7"
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"
FEED_EXPORT_ENCODING = "utf-8"

LOG_LEVEL = "INFO"
