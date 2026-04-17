CREATE TABLE categories (
  slug text PRIMARY KEY,
  name_tr text NOT NULL,
  display_order integer NOT NULL DEFAULT 0
);
