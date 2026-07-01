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
    inline_image_urls = scrapy.Field()   # list[str] of image URLs from article body
    image_alt_en = scrapy.Field()        # alt text from source <img> tag (English)
    # Pipeline-assigned fields (not set by spiders)
    score = scrapy.Field()              # 1-10 Africa relevance score
    turkey_filter_result = scrapy.Field()  # "PASS" or "SUPPRESS"
    image_alt_tr = scrapy.Field()       # translated image alt text (Turkish, max ~10 words)
