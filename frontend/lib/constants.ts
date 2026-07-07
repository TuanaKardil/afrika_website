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
