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
    "scraper.pipelines.DeduplicationPipeline": 100,
    "scraper.pipelines.SanitizationPipeline": 200,
    "scraper.pipelines.StoragePipeline": 300,
}

REQUEST_FINGERPRINTER_IMPLEMENTATION = "2.7"
TWISTED_REACTOR = "twisted.internet.asyncioreactor.AsyncioSelectorReactor"
FEED_EXPORT_ENCODING = "utf-8"

LOG_LEVEL = "INFO"
