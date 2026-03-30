const vscode = require('vscode');
const {
  evaluateSolution,
  fetchRandomProblem,
  normalizeRemoteProblem
} = require('./providers/lc');
const {
  createMernChallenge,
  openMernWorkspace,
  runMernTests
} = require('./providers/mern');

function getConfiguredMode() {
  const configured = String(
    vscode.workspace.getConfiguration('sidechick').get('mode', 'random')
  ).trim().toLowerCase();

  return ['dsa', 'dev', 'random'].includes(configured) ? configured : 'random';
}

function resolveMode(forcedMode) {
  const mode = forcedMode || getConfiguredMode();
  if (mode === 'random') {
    return Math.random() < 0.5 ? 'dsa' : 'dev';
  }

  return mode;
}

async function createDsaChallenge(apiClient, lcApi, sessionState) {
  const providerType = 'lc';
  
  if (providerType === 'lc') {
    try {
      const remoteProblem = await lcApi.getRandomFreeProblem();
      
      if (!remoteProblem || !remoteProblem.codeSnippets) {
         console.error('[SideChick] LeetCode fetch returned invalid problem data:', remoteProblem);
         throw new Error('Failed to fetch a valid problem from LeetCode GraphQL API. Code snippets may be missing.');
      }

      const starterCode = {};
      for (const snip of remoteProblem.codeSnippets || []) {
        starterCode[snip.langSlug] = snip.code;
      }
      
      return {
        id: remoteProblem.titleSlug,
        questionId: remoteProblem.questionId,
        type: 'lc',
        title: remoteProblem.title,
        titleSlug: remoteProblem.titleSlug,
        difficulty: remoteProblem.difficulty,
        tags: remoteProblem.topicTags ? remoteProblem.topicTags.map(t => t.name) : [],
        content: remoteProblem.content,
        source: lcApi.isAuthenticated() ? 'cloud' : 'cloud (read-only)',
        starterCode,
        sampleTestCase: remoteProblem.sampleTestCase,
        supportedLanguages: remoteProblem.codeSnippets ? remoteProblem.codeSnippets.map(s => ({ id: s.langSlug, name: s.lang })) : [],
        isLcApi: true
      };
    } catch (e) {
      console.error('[SideChick] LeetCode fetch fail:', e);
      throw e;
    }
  }

  const remoteProblem = sessionState.isAuthenticated
    ? normalizeRemoteProblem(await apiClient.fetchRandomProblem(providerType))
    : null;

  return remoteProblem || fetchRandomProblem(providerType);
}

async function createChallenge({ apiClient, lcApi, sessionState, forcedMode }) {
  const mode = resolveMode(forcedMode);

  if (mode === 'dev') {
    const mernChallenge = await createMernChallenge(apiClient);
    return {
      kind: 'mern',
      mode,
      scoringType: 'mern',
      problemId: mernChallenge.problemId,
      tempDir: mernChallenge.tempDir,
      webviewData: mernChallenge.webviewData
    };
  }

  const dsaChallenge = await createDsaChallenge(apiClient, lcApi, sessionState);
  return {
    kind: 'dsa',
    mode,
    scoringType: dsaChallenge.type,
    problemId: dsaChallenge.id,
    challenge: dsaChallenge.isLcApi ? null : dsaChallenge,
    webviewData: dsaChallenge
  };
}

async function runDsaCode(challenge, code, { publicOnly }) {
  return evaluateSolution(challenge.challenge, code, { publicOnly });
}

async function openDevWorkspace(challenge) {
  return openMernWorkspace(challenge.tempDir);
}

async function verifyDevChallenge(challenge) {
  return runMernTests(challenge.tempDir);
}

module.exports = {
  createChallenge,
  getConfiguredMode,
  openDevWorkspace,
  runDsaCode,
  verifyDevChallenge
};
