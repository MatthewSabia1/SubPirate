import { Database } from '../database.types'

export type FeatureKey = Database['public']['Tables']['subscription_features']['Row']['feature_key']

// Define all possible feature keys
export const FEATURE_KEYS = {
  ANALYZE_SUBREDDIT: 'analyze_subreddit',
  CREATE_PROJECT: 'create_project',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  EXPORT_DATA: 'export_data',
  TEAM_COLLABORATION: 'team_collaboration',
  CUSTOM_TRACKING: 'custom_tracking',
} as const

// Type for subscription tiers
export type SubscriptionTier = 'starter' | 'creator' | 'pro' | 'agency'

// Map of features included in each tier
export const TIER_FEATURES: Record<SubscriptionTier, FeatureKey[]> = {
  starter: [
    FEATURE_KEYS.ANALYZE_SUBREDDIT,
    FEATURE_KEYS.CREATE_PROJECT,
    FEATURE_KEYS.ADVANCED_ANALYTICS,
    FEATURE_KEYS.EXPORT_DATA,
    FEATURE_KEYS.TEAM_COLLABORATION,
    FEATURE_KEYS.CUSTOM_TRACKING,
  ],
  creator: [
    FEATURE_KEYS.ANALYZE_SUBREDDIT,
    FEATURE_KEYS.CREATE_PROJECT,
    FEATURE_KEYS.ADVANCED_ANALYTICS,
    FEATURE_KEYS.EXPORT_DATA,
    FEATURE_KEYS.TEAM_COLLABORATION,
    FEATURE_KEYS.CUSTOM_TRACKING,
  ],
  pro: [
    FEATURE_KEYS.ANALYZE_SUBREDDIT,
    FEATURE_KEYS.CREATE_PROJECT,
    FEATURE_KEYS.ADVANCED_ANALYTICS,
    FEATURE_KEYS.EXPORT_DATA,
    FEATURE_KEYS.TEAM_COLLABORATION,
    FEATURE_KEYS.CUSTOM_TRACKING,
  ],
  agency: [
    FEATURE_KEYS.ANALYZE_SUBREDDIT,
    FEATURE_KEYS.CREATE_PROJECT,
    FEATURE_KEYS.ADVANCED_ANALYTICS,
    FEATURE_KEYS.EXPORT_DATA,
    FEATURE_KEYS.TEAM_COLLABORATION,
    FEATURE_KEYS.CUSTOM_TRACKING,
  ],
}

// Feature descriptions for UI
export const FEATURE_DESCRIPTIONS: Record<FeatureKey, string> = {
  [FEATURE_KEYS.ANALYZE_SUBREDDIT]: 'Access to detailed subreddit analysis including marketing friendliness scores, posting requirements, and best practices',
  [FEATURE_KEYS.CREATE_PROJECT]: 'Create and manage marketing projects to organize your subreddit targets',
  [FEATURE_KEYS.ADVANCED_ANALYTICS]: 'Access to advanced analytics including engagement metrics, trend analysis, and detailed reporting',
  [FEATURE_KEYS.EXPORT_DATA]: 'Export analysis data and reports in various formats',
  [FEATURE_KEYS.TEAM_COLLABORATION]: 'Invite team members and collaborate on projects',
  [FEATURE_KEYS.CUSTOM_TRACKING]: 'Set up custom tracking metrics and alerts for your subreddits',
}

// Helper to check if a feature is included in a tier
export function isTierFeature(tier: SubscriptionTier, feature: FeatureKey): boolean {
  return TIER_FEATURES[tier].includes(feature)
}

// Get all features for a tier
export function getTierFeatures(tier: SubscriptionTier): FeatureKey[] {
  return TIER_FEATURES[tier]
}

// Get tier from product ID
export function getTierFromProductId(productId: string): SubscriptionTier | null {
  switch (productId) {
    case 'prod_starter':
      return 'starter'
    case 'prod_creator':
      return 'creator'
    case 'prod_pro':
      return 'pro'
    case 'prod_agency':
      return 'agency'
    default:
      return null
  }
}

// Get product ID from tier
export function getProductIdFromTier(tier: SubscriptionTier): string {
  switch (tier) {
    case 'starter':
      return 'prod_starter'
    case 'creator':
      return 'prod_creator'
    case 'pro':
      return 'prod_pro'
    case 'agency':
      return 'prod_agency'
  }
} 