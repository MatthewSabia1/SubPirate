import { supabase } from './supabase';
import { redditApi } from './redditApi';

export async function syncRedditAccountPosts(accountId: string): Promise<void> {
  try {
    // Get account info
    const { data: account, error: accountError } = await supabase
      .from('reddit_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError) throw accountError;
    if (!account) throw new Error('Account not found');

    // Set up the API client with the account's credentials
    await redditApi.setAccountAuth(accountId);

    // Fetch recent posts from Reddit
    const posts = await redditApi.getUserPosts(
      account.username,
      'new',
      100,
      'day'
    );

    // Get subreddit IDs for these posts
    const subredditNames = [...new Set(posts.map(post => post.subreddit))];
    const { data: subreddits, error: subredditError } = await supabase
      .from('subreddits')
      .select('id, name')
      .in('name', subredditNames);

    if (subredditError) throw subredditError;

    // Create map of subreddit names to IDs
    const subredditMap = new Map(
      subreddits.map(s => [s.name.toLowerCase(), s.id])
    );

    // Insert new posts
    const newPosts = posts.map(post => ({
      reddit_account_id: accountId,
      subreddit_id: subredditMap.get(post.subreddit.toLowerCase()),
      post_id: post.id,
      created_at: new Date(post.created_utc * 1000).toISOString()
    })).filter(post => post.subreddit_id); // Only posts for known subreddits

    if (newPosts.length > 0) {
      const { error: insertError } = await supabase
        .from('reddit_posts')
        .upsert(newPosts, {
          onConflict: 'reddit_account_id,post_id'
        });

      if (insertError) throw insertError;
    }

    // Update account stats
    const { error: updateError } = await supabase
      .from('reddit_accounts')
      .update({
        last_post_sync: new Date().toISOString(),
        total_posts: posts.length,
        posts_today: posts.filter(post => {
          const postDate = new Date(post.created_utc * 1000);
          const today = new Date();
          return postDate.toDateString() === today.toDateString();
        }).length,
        karma_score: posts.length > 0 ? posts[0].post_karma || 0 : account.karma_score
      })
      .eq('id', accountId);

    if (updateError) throw updateError;
  } catch (err) {
    console.error('Error syncing Reddit account posts:', err);
    throw err;
  }
}

export async function syncAllRedditAccounts(): Promise<void> {
  try {
    // Get accounts that need syncing
    const { data: accounts, error: accountError } = await supabase
      .from('reddit_accounts')
      .select('id')
      .lt('last_post_sync', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // 5 minutes ago

    if (accountError) throw accountError;
    if (!accounts) return;

    // Sync each account
    await Promise.all(
      accounts.map(account => syncRedditAccountPosts(account.id))
    );
  } catch (err) {
    console.error('Error syncing all Reddit accounts:', err);
    throw err;
  }
}