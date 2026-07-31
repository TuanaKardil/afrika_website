from scraper.spiders.strategies.rss import RssNewsSpider


class Medias24Spider(RssNewsSpider):
    name = "medias24"
    source_slug = "medias24"
