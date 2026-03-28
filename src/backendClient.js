const vscode = require('vscode');
const axios = require('axios');

function getBackendBaseUrl() {
  return vscode.workspace
    .getConfiguration('sidechick')
    .get('backendBaseUrl', 'http://127.0.0.1:3001')
    .replace(/\/+$/, '');
}

function getUserHandle() {
  const configuredHandle = vscode.workspace
    .getConfiguration('sidechick')
    .get('userHandle', '')
    .trim();

  if (configuredHandle) {
    return configuredHandle;
  }

  return `machine-${vscode.env.machineId.slice(0, 12)}`;
}

async function reportChallengeResult({ type, problemId, status, timeSecs }) {
  const url = `${getBackendBaseUrl()}/api/user/score`;

  await axios.post(
    url,
    {
      handle: getUserHandle(),
      type,
      problemId,
      status,
      timeSecs
    },
    {
      timeout: 5000
    }
  );
}

module.exports = {
  getBackendBaseUrl,
  reportChallengeResult
};
