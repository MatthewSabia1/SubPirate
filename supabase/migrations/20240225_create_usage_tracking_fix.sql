-- Create a table to track user usage (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.user_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subreddit_analysis_count INTEGER DEFAULT 0,
  month_start TIMESTAMP WITH TIME ZONE NOT NULL,
  month_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, month_start)
);

-- Create indexes for faster lookups (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_user_id ON public.user_usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_month ON public.user_usage_stats(month_start, month_end);

-- Drop existing functions before recreating them to avoid conflicts
DROP FUNCTION IF EXISTS increment_usage_stat;
DROP FUNCTION IF EXISTS get_user_usage_stats;

-- Function to increment usage counter
CREATE OR REPLACE FUNCTION increment_usage_stat(
  user_id_param UUID,
  stat_name TEXT,
  increment_by INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  current_month_start TIMESTAMP WITH TIME ZONE;
  current_month_end TIMESTAMP WITH TIME ZONE;
  stat_column TEXT;
BEGIN
  -- Calculate current month boundaries
  current_month_start := date_trunc('month', now());
  current_month_end := (date_trunc('month', now()) + interval '1 month' - interval '1 second');
  
  -- Validate stat_name to prevent SQL injection
  IF stat_name = 'subreddit_analysis_count' THEN
    stat_column := stat_name;
  ELSE
    RAISE EXCEPTION 'Invalid stat name: %', stat_name;
  END IF;
  
  -- Insert or update the usage record for the current month
  EXECUTE format('
    INSERT INTO public.user_usage_stats (
      user_id, 
      %I, 
      month_start, 
      month_end
    ) 
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, month_start) 
    DO UPDATE SET 
      %I = user_usage_stats.%I + $2,
      updated_at = now()
  ', stat_column, stat_column, stat_column)
  USING user_id_param, increment_by, current_month_start, current_month_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current usage stats for a user
CREATE OR REPLACE FUNCTION get_user_usage_stats(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  current_month_start TIMESTAMP WITH TIME ZONE;
  stats JSON;
BEGIN
  -- Calculate current month start
  current_month_start := date_trunc('month', now());
  
  -- Get the user's current usage stats
  SELECT json_build_object(
    'subreddit_analysis_per_month', COALESCE(subreddit_analysis_count, 0)
  ) INTO stats
  FROM public.user_usage_stats
  WHERE user_id = user_id_param AND month_start = current_month_start;
  
  -- If no record exists, return zeros
  IF stats IS NULL THEN
    stats := json_build_object(
      'subreddit_analysis_per_month', 0
    );
  END IF;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure RLS is enabled
ALTER TABLE public.user_usage_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid duplicates
DROP POLICY IF EXISTS "Users can view own usage stats" ON public.user_usage_stats;
DROP POLICY IF EXISTS "Application can update usage stats" ON public.user_usage_stats;

-- Users can only view their own usage stats
CREATE POLICY "Users can view own usage stats"
  ON public.user_usage_stats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only the application can update usage stats (via functions)
CREATE POLICY "Application can update usage stats"
  ON public.user_usage_stats
  FOR ALL
  TO service_role
  USING (true);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_usage_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_usage_stats TO anon;
GRANT EXECUTE ON FUNCTION increment_usage_stat TO service_role; 