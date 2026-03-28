const fs = require('fs');
const os = require('os');
const path = require('path');
const vscode = require('vscode');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');
const { getBackendBaseUrl } = require('../backendClient');

function getCatalogPath() {
  return path.join(__dirname, '..', '..', 'dev-problems', 'problems.json');
}

function getTemplatesRoot() {
  return path.join(__dirname, '..', '..', 'dev-problems');
}

function loadProblemCatalog() {
  const raw = fs.readFileSync(getCatalogPath(), 'utf8');
  const problems = JSON.parse(raw);

  if (!Array.isArray(problems) || problems.length === 0) {
    throw new Error('No local dev problems are configured.');
  }

  return problems;
}

function writeWorkspaceSettings(targetDir) {
  const vscodeDir = path.join(targetDir, '.vscode');
  fs.mkdirSync(vscodeDir, { recursive: true });
  fs.writeFileSync(
    path.join(vscodeDir, 'settings.json'),
    JSON.stringify(
      {
        'files.exclude': {
          tests: true
        }
      },
      null,
      2
    )
  );
}

function chooseProblem(problems) {
  return problems[Math.floor(Math.random() * problems.length)];
}

function createTempDir(problemId) {
  const tempDir = path.join(os.tmpdir(), `sidechick-dev-${problemId}-${uuidv4()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

function copyProblemTemplate(problem) {
  const templateDir = path.join(getTemplatesRoot(), problem.folder);
  const tempDir = createTempDir(problem.id);
  fs.cpSync(templateDir, tempDir, { recursive: true });
  return tempDir;
}

function readProblemMetadata(problemDir, fallbackProblem) {
  const configPath = path.join(problemDir, '.sidechick.json');
  if (!fs.existsSync(configPath)) {
    return {
      id: fallbackProblem.id,
      title: fallbackProblem.title
    };
  }

  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function resolveWorkspaceRoot(tempDir) {
  if (fs.existsSync(path.join(tempDir, '.sidechick.json'))) {
    return tempDir;
  }

  const children = fs
    .readdirSync(tempDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'));

  if (children.length === 1) {
    const childDir = path.join(tempDir, children[0].name);
    if (fs.existsSync(path.join(childDir, '.sidechick.json'))) {
      return childDir;
    }
  }

  return tempDir;
}

async function fetchRemoteProblem() {
  const url = `${getBackendBaseUrl()}/api/problems/dev/random`;
  const response = await axios.get(url, { timeout: 5000 });
  return response.data?.problem || null;
}

async function downloadRemoteProblem(problem) {
  const tempDir = createTempDir(problem.slug || problem.id || 'remote');
  const archivePath = path.join(tempDir, 'problem.zip');
  const response = await axios.get(problem.downloadUrl, {
    responseType: 'arraybuffer',
    timeout: 15000
  });

  fs.writeFileSync(archivePath, Buffer.from(response.data));
  new AdmZip(archivePath).extractAllTo(tempDir, true);
  fs.unlinkSync(archivePath);

  const workspaceRoot = resolveWorkspaceRoot(tempDir);
  writeWorkspaceSettings(workspaceRoot);
  return workspaceRoot;
}

function createLocalMernChallenge() {
  const catalog = loadProblemCatalog();
  const problem = chooseProblem(catalog);
  const tempDir = copyProblemTemplate(problem);
  writeWorkspaceSettings(tempDir);
  const metadata = readProblemMetadata(tempDir, problem);

  return {
    type: 'mern',
    source: 'local',
    tempDir,
    problemId: metadata.id || problem.id,
    title: metadata.title || problem.title
  };
}

async function createMernChallenge() {
  try {
    const remoteProblem = await fetchRemoteProblem();
    if (!remoteProblem) {
      return createLocalMernChallenge();
    }

    const tempDir = await downloadRemoteProblem(remoteProblem);
    const metadata = readProblemMetadata(tempDir, remoteProblem);

    return {
      type: 'mern',
      source: 'remote',
      tempDir,
      problemId: metadata.id || remoteProblem.slug || String(remoteProblem.id),
      title: metadata.title || remoteProblem.title
    };
  } catch {
    return createLocalMernChallenge();
  }
}

async function runMernTests(cwd) {
  return new Promise(async (resolve, reject) => {
    const task = new vscode.Task(
      { type: 'shell' },
      vscode.TaskScope.Workspace,
      'Sidechick MERN Tests',
      'sidechick',
      new vscode.ShellExecution('npm test', { cwd })
    );

    task.presentationOptions = {
      reveal: vscode.TaskRevealKind.Never,
      panel: vscode.TaskPanelKind.Dedicated,
      clear: true
    };

    let execution;
    let output = '';
    const terminalName = task.name;

    const writeDisposable = vscode.window.onDidWriteTerminalData((event) => {
      if (event.terminal.name === terminalName) {
        output += event.data;
      }
    });

    const endDisposable = vscode.tasks.onDidEndTaskProcess((event) => {
      if (!execution || event.execution !== execution) {
        return;
      }

      writeDisposable.dispose();
      endDisposable.dispose();

      resolve({
        status: event.exitCode === 0 ? 'Passed' : 'Failed',
        statusCode: event.exitCode === 0 ? 10 : -1,
        output: output.trim()
      });
    });

    try {
      execution = await vscode.tasks.executeTask(task);
    } catch (error) {
      writeDisposable.dispose();
      endDisposable.dispose();
      reject(error);
    }
  });
}

module.exports = {
  createMernChallenge,
  runMernTests
};
