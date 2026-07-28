/**
 * Single source of truth for the publication score threshold.
 *
 * The scraper drops anything below this (CLAUDE.md: "Score 6+ is published").
 * Every reader-facing gate — article page render, listings, search, sitemap,
 * news-sitemap, RSS — must use this so the three used to drift (article page 4,
 * listings 5, sitemap 6) and score 4-5 articles could be linked but absent from
 * the sitemap. Keep them unified here.
 */
export const MIN_PUBLISHED_SCORE = 6;

/**
 * Minimum article count for a hashtag page to be offered for indexing.
 *
 * Below this a tag page is a thin aggregation (1-2 articles, all of which are
 * indexed individually). It used to be excluded from sitemap.xml yet still
 * fully indexable, so Google crawled 152 of them and filed every one under
 * "Taranan, ancak dizine eklenmedi". The sitemap gate and the page's robots
 * tag must use this same constant so the two signals never contradict.
 */
export const HASHTAG_MIN_ARTICLES = 3;
