-- Apply before deploying the checkout editor. Additive and safe to rerun.
ALTER TABLE sales_pages ADD COLUMN IF NOT EXISTS checkout_url text;
