/**
 * The longest search term the catalogue accepts, shared by the page and the API so
 * the two boundaries agree: a `LIKE '%term%'` scan is unindexed, and no destination
 * name comes close to this, so a longer term is a mistake or an attempt to make the
 * database work for nothing.
 */
export const MAX_SEARCH_LENGTH = 100;
