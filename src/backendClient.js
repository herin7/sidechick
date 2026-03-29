const vscode = require('vscode');
const axios = require('axios');
const { isAnonymousMode, readBackendToken } = require('./auth');

function getBackendBaseUrl() {
  return vscode.workspace
    .getConfiguration('sidechick')
    .get('backendBaseUrl', 'http://127.0.0.1:3000')
    .replace(/\/+$/, '');
}

function createBackendClient(context) {
  async function request(config) {
    const headers = { ...(config.headers || {}) };

    if (config.attachAuth !== false) {
      const token = await readBackendToken(context);
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    const response = await axios({
      baseURL: getBackendBaseUrl(),
      timeout: config.timeout || 15000,
      ...config,
      headers
    });

    return response.data;
  }

  return {
    async loginWithGitHubProfile(profile) {
      return request({
        method: 'post',
        url: '/api/auth/login',
        data: profile,
        attachAuth: false
      });
    },

    async getUserStats() {
      if (isAnonymousMode(context)) {
        return null;
      }

      return request({
        method: 'get',
        url: '/api/user/stats'
      });
    },

    async reportChallengeResult({ type, problemId, status, timeSecs }) {
      if (isAnonymousMode(context)) {
        return { ok: false, skipped: true };
      }

      const token = await readBackendToken(context);
      if (!token) {
        return { ok: false, skipped: true };
      }

      return request({
        method: 'post',
        url: '/api/user/score',
        data: {
          type,
          problemId,
          status,
          timeSecs
        }
      });
    },

    async fetchRandomProblem(type) {
      if (isAnonymousMode(context)) {
        return null;
      }

      try {
        const data = await request({
          method: 'get',
          url: `/api/problems/${type}/random`
        });

        return data?.problem || null;
      } catch (error) {
        console.warn(`[Sidechick] remote ${type} problem fetch failed:`, error.message);
        return null;
      }
    }
  };
}

module.exports = {
  createBackendClient,
  getBackendBaseUrl
};
