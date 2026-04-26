import scrapy


class ArticleItem(scrapy.Item):
    source = scrapy.Field()
    source_url = scrapy.Field()
    title_original = scrapy.Field()
    title_tr = scrapy.Field()
    excerpt_original = scrapy.Field()
    excerpt_tr = scrapy.Field()
    content_original = scrapy.Field()
    content_tr = scrapy.Field()
    author_original = scrapy.Field()
    published_at = scrapy.Field()
    featured_image_source_url = scrapy.Field()
    image_credit = scrapy.Field()
    nav_tab_slug = scrapy.Field()
    sector_slugs = scrapy.Field()
    region_slug = scrapy.Field()
    hashtags = scrapy.Field()
    is_suppressed = scrapy.Field()
    is_update = scrapy.Field()
