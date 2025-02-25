-- insert-missing-products.sql
-- This script identifies and adds missing products that are referenced by stripe_prices
-- Run this BEFORE other schema fixes

-- Identify missing product IDs
SELECT DISTINCT p.product_id
FROM stripe_prices p
LEFT JOIN stripe_products s ON p.product_id = s.stripe_product_id
WHERE s.stripe_product_id IS NULL;

-- Insert missing products
-- Run these INSERT statements to add all missing products

-- Missing product 1
INSERT INTO stripe_products (
  stripe_product_id, 
  name, 
  description, 
  active, 
  created_at, 
  updated_at
) 
VALUES (
  'prod_RpeDBw9OteYUhH',
  'Unknown Product 1',
  'Automatically added to fix database constraint',
  true,
  NOW(),
  NOW()
);

-- Missing product 2
INSERT INTO stripe_products (
  stripe_product_id, 
  name, 
  description, 
  active, 
  created_at, 
  updated_at
) 
VALUES (
  'prod_RpeE3bsaw2nQ7N',
  'Unknown Product 2',
  'Automatically added to fix database constraint',
  true,
  NOW(),
  NOW()
);

-- Missing product 3
INSERT INTO stripe_products (
  stripe_product_id, 
  name, 
  description, 
  active, 
  created_at, 
  updated_at
) 
VALUES (
  'prod_RpeDP1ClkYl7nH',
  'Unknown Product 3',
  'Automatically added to fix database constraint',
  true,
  NOW(),
  NOW()
);

-- Missing product 4
INSERT INTO stripe_products (
  stripe_product_id, 
  name, 
  description, 
  active, 
  created_at, 
  updated_at
) 
VALUES (
  'prod_RpeErBzCSyArMr',
  'Unknown Product 4',
  'Automatically added to fix database constraint',
  true,
  NOW(),
  NOW()
);

-- Verify no more missing products
SELECT DISTINCT p.product_id AS missing_product_id
FROM stripe_prices p
LEFT JOIN stripe_products s ON p.product_id = s.stripe_product_id
WHERE s.stripe_product_id IS NULL; 