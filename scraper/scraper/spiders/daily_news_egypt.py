from scraper.spiders.strategies.rss import RssNewsSpider


class DailyNewsEgyptSpider(RssNewsSpider):
    name = "daily_news_egypt"
    source_slug = "daily_news_egypt"
