from scraper.spiders.strategies.html_index import HtmlIndexNewsSpider


class NewTimesRwandaSpider(HtmlIndexNewsSpider):
    name = "new_times_rwanda"
    source_slug = "new_times_rwanda"
