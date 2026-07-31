from scraper.spiders.strategies.rss import RssNewsSpider


class NairametricsSpider(RssNewsSpider):
    name = "nairametrics"
    source_slug = "nairametrics"
