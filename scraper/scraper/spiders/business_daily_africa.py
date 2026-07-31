from scraper.spiders.strategies.sitemap import SitemapNewsSpider


class BusinessDailyAfricaSpider(SitemapNewsSpider):
    name = "business_daily_africa"
    source_slug = "business_daily_africa"
