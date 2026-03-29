const axios = require('axios');

const LC_SESSION_KEY = 'sidechick.leetcode_session';
const LC_CSRF_KEY = 'sidechick.leetcode_csrf';

class LeetCodeAPI {
  constructor(context) {
    this.context = context;
    this.session = '';
    this.csrfToken = '';
    this.client = axios.create({
      baseURL: 'https://leetcode.com',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://leetcode.com/'
      }
    });

    this.client.interceptors.request.use((config) => {
      if (this.session && this.csrfToken) {
        config.headers['Cookie'] = `LEETCODE_SESSION=${this.session}; csrftoken=${this.csrfToken}`;
        config.headers['x-csrftoken'] = this.csrfToken;
      }
      return config;
    });
  }

  async loadAuth() {
    try {
      this.session = await this.context.secrets.get(LC_SESSION_KEY) || '';
      this.csrfToken = await this.context.secrets.get(LC_CSRF_KEY) || '';
    } catch {
      // ignore
    }
  }

  async setAuth(session, csrf) {
    this.session = session;
    this.csrfToken = csrf;
    await this.context.secrets.store(LC_SESSION_KEY, session);
    await this.context.secrets.store(LC_CSRF_KEY, csrf);
  }

  isAuthenticated() {
    return Boolean(this.session && this.csrfToken);
  }

  async fetchRandomProblemSlug() {
    const res = await this.client.post('/graphql', {
      query: 'query randomQuestion { randomQuestion(categorySlug: "", filters: {}) { titleSlug } }'
    });
    return res.data?.data?.randomQuestion?.titleSlug;
  }

  async fetchProblemDetails(titleSlug) {
    const query = `query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { questionId title titleSlug content difficulty codeSnippets { lang langSlug code } sampleTestCase topicTags { name } isPaidOnly } }`;
    const res = await this.client.post('/graphql', {
      query,
      variables: { titleSlug }
    });
    return res.data?.data?.question;
  }

  async getRandomFreeProblem() {
    // Avoid paid questions by fetching until we find a free one (max 5 tries)
    for (let i = 0; i < 5; i++) {
        const titleSlug = await this.fetchRandomProblemSlug();
        if (!titleSlug) continue;
        const details = await this.fetchProblemDetails(titleSlug);
        if (details && !details.isPaidOnly && details.codeSnippets?.length > 0 && details.content) {
            return details;
        }
    }
    throw new Error('Could not find a free LeetCode problem right now.');
  }

  async interpretSolution(titleSlug, questionId, code, langSlug, dataInput) {
    if (!this.isAuthenticated()) throw new Error('Not authenticated with LeetCode');
    const res = await this.client.post(`/problems/${titleSlug}/interpret_solution/`, {
      lang: langSlug,
      question_id: String(questionId),
      typed_code: code,
      data_input: dataInput
    });
    
    const runId = res.data?.interpret_id || res.data?.run_id;
    if (!runId) throw new Error(`LeetCode rejected the run request: ${JSON.stringify(res.data)}`);
    return runId;
  }

  async submitSolution(titleSlug, questionId, code, langSlug) {
    if (!this.isAuthenticated()) throw new Error('Not authenticated with LeetCode');
    
    // LeetCode requires the referer for submit endpoints sometimes
    const headers = { 'Referer': `https://leetcode.com/problems/${titleSlug}/` };
    
    const res = await this.client.post(`/problems/${titleSlug}/submit/`, {
      lang: langSlug,
      question_id: String(questionId),
      typed_code: code
    }, { headers });
    
    const runId = res.data?.submission_id || res.data?.run_id;
    if (!runId) throw new Error(`LeetCode rejected the submit request: ${JSON.stringify(res.data)}`);
    return runId;
  }

  async pollSubmissionResult(runId, abortSignal, maxAttempts = 30) {
    if (!this.isAuthenticated()) throw new Error('Not authenticated with LeetCode');
    if (!runId) throw new Error('No valid run ID found to poll. Please restart the challenge.');
    
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      if (abortSignal?.cancelled) {
        throw new Error('Execution cancelled by user.');
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const res = await this.client.get(`/submissions/detail/${runId}/check/`);
      if (res.data?.state === 'SUCCESS') {
        return res.data;
      }
    }
    throw new Error('LeetCode execution timed out.');
  }
}

module.exports = { LeetCodeAPI };
