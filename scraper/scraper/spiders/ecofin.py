from scraper.spiders.strategies.html_index import HtmlIndexNewsSpider


class EcofinSpider(HtmlIndexNewsSpider):
    name = "ecofin"
    source_slug = "ecofin"
