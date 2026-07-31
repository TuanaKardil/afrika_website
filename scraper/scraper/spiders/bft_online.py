from scraper.spiders.strategies.sitemap import SitemapNewsSpider


class BftOnlineSpider(SitemapNewsSpider):
    name = "bft_online"
    source_slug = "bft_online"
