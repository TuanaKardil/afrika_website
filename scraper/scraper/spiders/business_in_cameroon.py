from scraper.spiders.strategies.html_index import HtmlIndexNewsSpider


class BusinessInCameroonSpider(HtmlIndexNewsSpider):
    name = "business_in_cameroon"
    source_slug = "business_in_cameroon"
