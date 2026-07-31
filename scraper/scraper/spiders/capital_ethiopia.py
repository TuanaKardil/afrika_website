from scraper.spiders.strategies.rss import RssNewsSpider


class CapitalEthiopiaSpider(RssNewsSpider):
    name = "capital_ethiopia"
    source_slug = "capital_ethiopia"
