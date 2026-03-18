/**
 * Aether Backend Bridge
 * Handles communication between React and FastAPI
 */

// Use relative path so the Vite Proxy handles the routing
const API_BASE = '/api';

// API Key for authentication (in production, use environment variable)
const API_KEY = 'aether-secret-key-123';

export const triageAPI = {
  /**
   * Analyze text using the AI pipeline
   * @param {string} text - The raw customer input
   * @returns {Promise<Object>} Analysis result from backend
   */
  async analyze(text) {
    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,  // API authentication
          'X-Client-ID': 'aether-frontend-v1'
        },
        body: JSON.stringify({ 
          text: text,
          language: "auto" // Auto-detect language
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error cases
        if (response.status === 403) {
          throw new Error(`Authentication Failed: ${errorData.detail || 'Invalid API key'}`);
        }
        if (response.status === 429) {
          throw new Error(`Rate Limit Exceeded: ${errorData.detail || 'Too many requests. Please wait and try again.'}`);
        }
        
        throw new Error(errorData.detail || `Server Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("🔥 API Connection Failed:", error.message || error);
      throw error;
    }
  },

  /**
   * Get Cache Performance Stats
   * @returns {Promise<Object|null>} Cache statistics or null if unavailable
   */
  async getStats() {
    try {
      const response = await fetch(`${API_BASE}/cache/stats`, {
        headers: {
          'X-API-Key': API_KEY
        }
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.warn("⚠️ Could not fetch stats:", error);
      return null;
    }
  },

  /**
   * Clear the response cache
   * @returns {Promise<Object|null>} Clear result or null if failed
   */
  async clearCache() {
    try {
      const response = await fetch(`${API_BASE}/cache/clear`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY
        }
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.warn("⚠️ Could not clear cache:", error);
      return null;
    }
  },

  /**
   * Health check endpoint
   * @returns {Promise<boolean>} true if backend is healthy
   */
  async healthCheck() {
    try {
      const response = await fetch(`${API_BASE}/../health`);
      return response.ok;
    } catch (error) {
      console.warn("⚠️ Backend health check failed:", error);
      return false;
    }
  }
};
