import scrapy


class ArticleItem(scrapy.Item):
    source = scrapy.Field()
    source_url = scrapy.Field()
    title_original = scrapy.Field()
    excerpt_original = scrapy.Field()
    content_original = scrapy.Field()
    author_original = scrapy.Field()
    published_at = scrapy.Field()
    featured_image_source_url = scrapy.Field()
    image_credit = scrapy.Field()
    category_slug = scrapy.Field()
    region_slug = scrapy.Field()
    is_update = scrapy.Field()
