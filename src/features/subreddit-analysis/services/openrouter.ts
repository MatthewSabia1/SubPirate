/* src/features/subreddit-analysis/services/openrouter.ts */

import { SYSTEM_PROMPT, ANALYSIS_PROMPT } from '../lib/prompts';

export class OpenRouter {
  private apiKey: string;
  private baseUrl = 'https://api.openrouter.com/v1';

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }
    this.apiKey = apiKey;
  }

  async analyzeSubreddit(data: any): Promise<any> {
    try {
      const prompt = this.buildPrompt(data);
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'x-ai/grok-2-1212',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'subredditAnalysis',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  subreddit: { type: 'string' },
                  subscribers: { type: 'number' },
                  activeUsers: { type: 'number' },
                  marketingFriendliness: {
                    type: 'object',
                    properties: {
                      score: { type: 'number' },
                      reasons: { type: 'array', items: { type: 'string' } },
                      recommendations: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['score', 'reasons', 'recommendations'],
                    additionalProperties: false
                  },
                  postingGuidelines: {
                    type: 'object',
                    properties: {
                      allowedTypes: { type: 'array', items: { type: 'string' } },
                      restrictions: { type: 'array', items: { type: 'string' } },
                      recommendations: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['allowedTypes', 'restrictions', 'recommendations'],
                    additionalProperties: false
                  },
                  contentStrategy: {
                    type: 'object',
                    properties: {
                      postTypes: { type: 'array', items: { type: 'string' } },
                      timing: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            hour: { type: 'number' },
                            timezone: { type: 'string' }
                          },
                          required: ['hour', 'timezone'],
                          additionalProperties: false
                        }
                      },
                      topics: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['postTypes', 'timing', 'topics'],
                    additionalProperties: false
                  },
                  strategicAnalysis: {
                    type: 'object',
                    properties: {
                      strengths: { type: 'array', items: { type: 'string' } },
                      weaknesses: { type: 'array', items: { type: 'string' } },
                      opportunities: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['strengths', 'weaknesses', 'opportunities'],
                    additionalProperties: false
                  }
                },
                required: ['subreddit', 'subscribers', 'activeUsers', 'marketingFriendliness', 'postingGuidelines', 'contentStrategy', 'strategicAnalysis'],
                additionalProperties: false
              }
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const result = await response.json();
      return this.transformResponse(result.choices[0].message.content);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error('Unknown error');
    }
  }

  private buildPrompt(data: any): string {
    // Build the prompt using the analysis prompt and subreddit data
    return `${ANALYSIS_PROMPT}\nData: ${JSON.stringify(data)}`;
  }

  private safeJsonParse(jsonStr: string): any {
    let balanced = jsonStr;
    const maxIterations = 50;
    for (let i = 0; i < maxIterations; i++) {
      try {
        return JSON.parse(balanced);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        if (errorMessage.includes('Unterminated string')) {
          // If it doesn't end with a double quote, try appending one
          if (!balanced.endsWith('"')) {
            try {
              return JSON.parse(balanced + '"');
            } catch (_) {
              // If that doesn't work, continue
            }
          }
          balanced = balanced.slice(0, -1);
          if (balanced.length === 0) break;
        } else if (errorMessage.includes('Unexpected end of JSON input')) {
          balanced = balanced.slice(0, -1);
          if (balanced.length === 0) break;
        } else {
          break;
        }
      }
    }
    throw new Error('Failed to parse JSON after truncation attempts.');
  }

  private transformResponse(responseContent: string): any {
    // Attempt to extract the JSON portion from the response content.
    // First, try to get the substring between the first '{' and the last '}'.
    const firstBrace = responseContent.indexOf('{');
    const lastBrace = responseContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonString = responseContent.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(jsonString);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('Initial JSON.parse failed:', errorMessage);
        // If parsing fails, fall through to regex extraction below
      }
    }

    // Fallback: Use a regex to extract the first occurrence of a JSON object
    const jsonRegex = /\{[\s\S]*\}/;
    const match = responseContent.match(jsonRegex);
    if (match) {
      try {
        // Use the safeJsonParse to attempt to parse a potentially truncated JSON
        return this.safeJsonParse(match[0]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        throw new Error('Failed to extract valid JSON: ' + errorMessage);
      }
    } else {
      throw new Error('No valid JSON found in the response.');
    }
  }
} 