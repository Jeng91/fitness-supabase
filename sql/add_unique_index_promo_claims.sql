-- Migration: add_unique_index_promo_claims.sql
-- Purpose: enforce single-use promo per user by creating a unique index on (promo_id, user_id)

-- Make sure tbl_promo_claims exists before running this
CREATE UNIQUE INDEX IF NOT EXISTS uq_promo_user ON public.tbl_promo_claims(promo_id, user_id);

-- Note:
-- If you already have duplicate rows this will fail. Ensure no duplicates exist before applying.
-- To remove duplicates (if any), you can run a query to keep the earliest claim per user/promo and delete others.

-- Example to detect duplicates:
-- SELECT promo_id, user_id, count(*) FROM public.tbl_promo_claims GROUP BY promo_id, user_id HAVING count(*) > 1;

-- Example to remove duplicates keeping the earliest used_at (use with caution):
-- WITH ranked AS (
--   SELECT claim_id, ROW_NUMBER() OVER (PARTITION BY promo_id, user_id ORDER BY used_at) AS rn
--   FROM public.tbl_promo_claims
-- ) DELETE FROM public.tbl_promo_claims WHERE claim_id IN (SELECT claim_id FROM ranked WHERE rn > 1);

-- After cleaning duplicates, run the CREATE UNIQUE INDEX statement above.
