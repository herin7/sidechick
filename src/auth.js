const vscode = require('vscode');
const axios = require('axios');

const ONBOARDING_KEY = 'sidechick.onboardingSeen';
const ANONYMOUS_KEY = 'sidechick.isAnonymous';
const GITHUB_SESSION_KEY = 'sidechick.githubSession';
const GITHUB_PROFILE_KEY = 'sidechick.githubProfile';
const BACKEND_TOKEN_KEY = 'sidechick.backendToken';
const BACKEND_USER_KEY = 'sidechick.backendUser';

function safeJsonParse(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function readSecretJson(context, key) {
  return safeJsonParse(await context.secrets.get(key));
}

async function writeSecretJson(context, key, value) {
  await context.secrets.store(key, JSON.stringify(value));
}

function isAnonymousMode(context) {
  return Boolean(context.globalState.get(ANONYMOUS_KEY, false));
}

async function setAnonymousMode(context, isAnonymous) {
  await context.globalState.update(ANONYMOUS_KEY, Boolean(isAnonymous));
}

function hasSeenOnboarding(context) {
  return Boolean(context.globalState.get(ONBOARDING_KEY, false));
}

async function markOnboardingSeen(context) {
  await context.globalState.update(ONBOARDING_KEY, true);
}

async function fetchGitHubProfile(accessToken) {
  const response = await axios.get('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SideChick-VSCode'
    },
    timeout: 15000
  });

  return {
    id: Number(response.data?.id),
    handle: String(response.data?.login || '').trim(),
    avatarUrl: response.data?.avatar_url || '',
    name: response.data?.name || response.data?.login || ''
  };
}

async function getStoredAuth(context) {
  const [githubSession, githubProfile, backendToken, backendUser] = await Promise.all([
    readSecretJson(context, GITHUB_SESSION_KEY),
    readSecretJson(context, GITHUB_PROFILE_KEY),
    context.secrets.get(BACKEND_TOKEN_KEY),
    readSecretJson(context, BACKEND_USER_KEY)
  ]);

  return {
    githubSession,
    githubProfile,
    backendToken: backendToken || '',
    backendUser
  };
}

async function readBackendToken(context) {
  return String((await context.secrets.get(BACKEND_TOKEN_KEY)) || '').trim();
}

async function clearStoredAuth(context) {
  await Promise.all([
    context.secrets.delete(GITHUB_SESSION_KEY),
    context.secrets.delete(GITHUB_PROFILE_KEY),
    context.secrets.delete(BACKEND_TOKEN_KEY),
    context.secrets.delete(BACKEND_USER_KEY)
  ]);
}

async function signInWithGitHub(context, apiClient) {
  const session = await vscode.authentication.getSession(
    'github',
    ['read:user'],
    { createIfNone: true }
  );

  if (!session) {
    return null;
  }

  const githubProfile = await fetchGitHubProfile(session.accessToken);
  if (!githubProfile.id || !githubProfile.handle) {
    throw new Error('GitHub did not return a usable profile.');
  }

  const loginPayload = await apiClient.loginWithGitHubProfile(githubProfile);

  await Promise.all([
    writeSecretJson(context, GITHUB_SESSION_KEY, {
      accessToken: session.accessToken,
      account: session.account
    }),
    writeSecretJson(context, GITHUB_PROFILE_KEY, githubProfile),
    context.secrets.store(BACKEND_TOKEN_KEY, loginPayload.token),
    writeSecretJson(context, BACKEND_USER_KEY, loginPayload.user),
    setAnonymousMode(context, false)
  ]);

  return {
    githubProfile,
    backendUser: loginPayload.user,
    token: loginPayload.token
  };
}

async function getSessionState(context, apiClient) {
  const stored = await getStoredAuth(context);
  const anonymous = isAnonymousMode(context);
  const authenticated = !anonymous && Boolean(stored.backendToken && stored.backendUser);

  let stats = null;
  if (authenticated) {
    try {
      stats = await apiClient.getUserStats();
    } catch (error) {
      console.warn('[Sidechick] failed to refresh stats:', error.message);
    }
  }

  return {
    isAnonymous: anonymous,
    isAuthenticated: authenticated,
    user: authenticated ? (stats?.user || stored.backendUser) : null,
    streak: authenticated ? Number(stats?.streak || 0) : 0,
    solved: authenticated ? Number(stats?.solved || 0) : 0
  };
}

module.exports = {
  BACKEND_TOKEN_KEY,
  clearStoredAuth,
  getSessionState,
  getStoredAuth,
  hasSeenOnboarding,
  isAnonymousMode,
  markOnboardingSeen,
  readBackendToken,
  setAnonymousMode,
  signInWithGitHub
};
