-- Create subscription_status type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM (
        'trialing',
        'active',
        'canceled',
        'incomplete',
        'incomplete_expired',
        'past_due',
        'unpaid',
        'paused'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop tables with CASCADE to handle dependencies
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.stripe_prices CASCADE;

-- Create tables for Stripe integration
CREATE TABLE public.stripe_prices (
    id text PRIMARY KEY,
    active boolean DEFAULT true,
    currency text DEFAULT 'usd',
    unit_amount integer,
    type text DEFAULT 'recurring',
    recurring_interval text DEFAULT 'month',
    product_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    status subscription_status NOT NULL,
    price_id text REFERENCES stripe_prices(id),
    quantity integer DEFAULT 1,
    cancel_at_period_end boolean DEFAULT false,
    cancel_at timestamptz,
    canceled_at timestamptz,
    current_period_start timestamptz,
    current_period_end timestamptz,
    created_at timestamptz DEFAULT now(),
    ended_at timestamptz,
    trial_start timestamptz,
    trial_end timestamptz
);

-- Recreate the customer_subscriptions table with its foreign key
CREATE TABLE IF NOT EXISTS public.customer_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id uuid NOT NULL,
    stripe_price_id text REFERENCES stripe_prices(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Insert or update prices
INSERT INTO public.stripe_prices (id, unit_amount, product_id)
VALUES 
    ('price_1QvyvlCtsTY6FiiZizercIly', 1999, 'prod_RpeDBw9OteYUhH'),
    ('price_1QvyvTCtsTY6FiiZ4xK1M82X', 3999, 'prod_RpeDP1ClkYl7nH'),
    ('price_1QvyvaCtsTY6FiiZfyf3jfH2', 4799, 'prod_RpeErBzCSyArMr'),
    ('price_1QvyvhCtsTY6FiiZpHBontp5', 9799, 'prod_RpeE3bsaw2nQ7N')
ON CONFLICT (id) DO UPDATE 
SET unit_amount = EXCLUDED.unit_amount,
    updated_at = now()
RETURNING id, unit_amount;

-- Update any existing subscriptions
WITH price_mapping AS (
    SELECT id, unit_amount 
    FROM public.stripe_prices
)
UPDATE public.subscriptions s
SET price_id = pm.id
FROM price_mapping pm
WHERE s.status = 'active' 
AND EXISTS (
    SELECT 1 FROM public.stripe_prices sp
    WHERE sp.unit_amount = 
        CASE 
            WHEN pm.unit_amount = 1999 THEN 1900
            WHEN pm.unit_amount = 3999 THEN 3400
            WHEN pm.unit_amount = 4799 THEN 4900
            WHEN pm.unit_amount = 9799 THEN 9700
        END
    AND s.price_id = sp.id
);
