// API endpoints for the Chrome extension
// These routes should be integrated into the main application's server

import { supabase } from '../src/lib/supabase';
import { analyzeSubredditData } from '../src/lib/analysis';

/**
 * Extension API Routes - Add these to your Express/Node server
 */

// Middleware to verify extension requests
export const verifyExtensionAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
    
    // Add user to request object for use in route handlers
    req.user = user;
    next();
  } catch (error) {
    console.error('Extension auth error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

// Save subreddit endpoint
export const saveSubreddit = async (req, res) => {
  try {
    const { subreddit } = req.body;
    const userId = req.user.id;
    
    if (!subreddit) {
      return res.status(400).json({ error: 'Subreddit name is required' });
    }
    
    // First check if this subreddit already exists in the database
    const { data: existingSubreddit, error: lookupError } = await supabase
      .from('subreddits')
      .select('*')
      .eq('name', subreddit)
      .maybeSingle();
      
    if (lookupError) {
      throw lookupError;
    }
    
    if (existingSubreddit) {
      // Add to user's saved list if not already saved
      await supabase
        .from('saved_subreddits')
        .upsert({
          subreddit_id: existingSubreddit.id,
          user_id: userId,
          last_post_at: null
        });
      
      return res.status(200).json({ 
        message: 'Subreddit saved successfully',
        subreddit: existingSubreddit
      });
    }
    
    // If subreddit doesn't exist, we need to create it
    // First, we need to get basic info about the subreddit from Reddit API
    // This is a simplified version - in production you'd want to use your Reddit API integration
    const subredditInfo = await fetchSubredditInfo(subreddit);
    
    // Create new subreddit
    const { data: newSubreddit, error: insertError } = await supabase
      .from('subreddits')
      .insert({
        name: subreddit,
        subscriber_count: subredditInfo.subscribers || 0,
        active_users: subredditInfo.active_users || 0,
        marketing_friendly_score: 0, // Will be calculated later during analysis
        posting_requirements: {
          allowedTypes: [],
          restrictions: [],
          recommendations: []
        },
        posting_frequency: {
          postTypes: [],
          timing: [],
          topics: []
        },
        allowed_content: ['text', 'link'],
        best_practices: [],
        rules_summary: '',
        last_analyzed_at: new Date().toISOString(),
        icon_img: subredditInfo.icon_img || '',
        community_icon: subredditInfo.community_icon || ''
      })
      .select()
      .single();
    
    if (insertError) {
      throw insertError;
    }
    
    // Add to user's saved list
    await supabase
      .from('saved_subreddits')
      .upsert({
        subreddit_id: newSubreddit.id,
        user_id: userId,
        last_post_at: null
      });
    
    return res.status(201).json({ 
      message: 'Subreddit created and saved successfully',
      subreddit: newSubreddit
    });
  } catch (error) {
    console.error('Error in saveSubreddit:', error);
    res.status(500).json({ error: 'Failed to save subreddit' });
  }
};

// Analyze subreddit endpoint
export const analyzeSubreddit = async (req, res) => {
  try {
    const { subreddit } = req.body;
    const userId = req.user.id;
    
    if (!subreddit) {
      return res.status(400).json({ error: 'Subreddit name is required' });
    }
    
    // Start analysis in background
    // This is an async operation that will take time
    // In a real implementation, you'd want to use a queue or background worker
    analyzeSubredditData(
      subreddit,
      (progress) => {
        console.log(`Analysis progress for ${subreddit}:`, progress);
        // Could implement WebSockets to push progress updates to client
      }
    ).then(async (result) => {
      // When analysis completes, update the subreddit in the database
      if (result && result.marketingFriendlyScore !== undefined) {
        await supabase
          .from('subreddits')
          .update({
            marketing_friendly_score: result.marketingFriendlyScore,
            posting_requirements: result.postingRequirements || {},
            posting_frequency: result.postingFrequency || {},
            allowed_content: result.allowedContentTypes || ['text', 'link'],
            best_practices: result.bestPractices || [],
            rules_summary: result.rulesSummary || '',
            last_analyzed_at: new Date().toISOString()
          })
          .eq('name', subreddit);
      }
    }).catch((error) => {
      console.error(`Analysis error for ${subreddit}:`, error);
    });
    
    // Return immediately as analysis will continue in background
    return res.status(202).json({ 
      message: 'Analysis started successfully',
      subreddit: subreddit
    });
  } catch (error) {
    console.error('Error starting analysis:', error);
    res.status(500).json({ error: 'Failed to start analysis' });
  }
};

// Get projects endpoint
export const getProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's projects
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return res.status(200).json({ projects: projects || [] });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

// Add subreddit to project endpoint
export const addToProject = async (req, res) => {
  try {
    const { subreddit, projectId } = req.body;
    const userId = req.user.id;
    
    if (!subreddit || !projectId) {
      return res.status(400).json({ error: 'Subreddit name and project ID are required' });
    }
    
    // Check if project exists and belongs to user
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();
    
    if (projectError || !project) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }
    
    // Get subreddit ID
    const { data: subredditData, error: subredditError } = await supabase
      .from('subreddits')
      .select('id')
      .eq('name', subreddit)
      .single();
    
    if (subredditError || !subredditData) {
      return res.status(404).json({ error: 'Subreddit not found' });
    }
    
    // Add subreddit to project
    const { error: addError } = await supabase
      .from('project_subreddits')
      .upsert({
        project_id: projectId,
        subreddit_id: subredditData.id
      });
    
    if (addError) {
      throw addError;
    }
    
    return res.status(200).json({ 
      message: 'Subreddit added to project successfully',
      projectId: projectId,
      subredditId: subredditData.id
    });
  } catch (error) {
    console.error('Error adding to project:', error);
    res.status(500).json({ error: 'Failed to add subreddit to project' });
  }
};

// Helper function to fetch subreddit info from Reddit
// In a real implementation, you'd use your existing Reddit API integration
async function fetchSubredditInfo(subredditName) {
  try {
    // This is a placeholder - you should replace with your actual Reddit API integration
    // For now, we'll just return some default values
    return {
      name: subredditName,
      subscribers: 0,
      active_users: 0,
      icon_img: '',
      community_icon: ''
    };
  } catch (error) {
    console.error(`Error fetching info for r/${subredditName}:`, error);
    return {
      name: subredditName,
      subscribers: 0,
      active_users: 0,
      icon_img: '',
      community_icon: ''
    };
  }
}

// Example of how to add these routes to an Express server
/*
import express from 'express';
const router = express.Router();

// Extension API routes
router.post('/api/extension/save-subreddit', verifyExtensionAuth, saveSubreddit);
router.post('/api/extension/analyze-subreddit', verifyExtensionAuth, analyzeSubreddit);
router.get('/api/extension/projects', verifyExtensionAuth, getProjects);
router.post('/api/extension/add-to-project', verifyExtensionAuth, addToProject);

export default router;
*/
