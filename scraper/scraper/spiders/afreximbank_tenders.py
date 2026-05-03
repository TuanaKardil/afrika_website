"""Spider for Afreximbank tenders.

STATUS: DISABLED — afreximbank.com returns 403 on all requests via Akamai WAF
(IP-level block, not page-specific). Cannot be scraped without a residential proxy.
"""

# This spider is intentionally left without a class definition so Scrapy
# does not register it. Re-enable if a proxy or public RSS/API feed becomes available.
