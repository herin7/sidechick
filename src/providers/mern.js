const fs = require('fs');
const os = require('os');
const path = require('path');
const vscode = require('vscode');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');

function getCatalogPath() {
  return path.join(__dirname, '..', '..', 'dev-problems', 'problems.json');
}

function getTemplatesRoot() {
  return path.join(__dirname, '..', '..', 'dev-problems');
}

function loadProblemCatalog() {
  return JSON.parse(fs.readFileSync(getCatalogPath(), 'utf8'));
}

function chooseProblem(problems) {
  return problems[Math.floor(Math.random() * problems.length)];
}

function createTempDir(problemId) {
  const tempDir = path.join(os.tmpdir(), `sidechick-dev-${problemId}-${uuidv4()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
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

function copyProblemTemplate(problem) {
  const templateDir = path.join(getTemplatesRoot(), problem.folder);
  const tempDir = createTempDir(problem.id);
  fs.cpSync(templateDir, tempDir, { recursive: true });
  return tempDir;
}

function readProblemMetadata(problemDir, fallbackProblem) {
  const configPath = path.join(problemDir, '.sidechick.json');
  if (!fs.existsSync(configPath)) {
    return fallbackProblem;
  }

  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function buildInstructionsHtml(metadata) {
  const paragraphs = Array.isArray(metadata.description)
    ? metadata.description
    : [metadata.description || 'Open the workspace and fix the failing tests.'];

  return paragraphs.map((line) => `<p>${line}</p>`).join('');
}

async function createMernChallenge() {
  const problem = chooseProblem(loadProblemCatalog());
  const tempDir = copyProblemTemplate(problem);
  writeWorkspaceSettings(tempDir);
  const metadata = readProblemMetadata(tempDir, problem);

  return {
    type: 'mern',
    problemId: metadata.id || problem.id,
    tempDir,
    webviewData: {
      id: metadata.id || problem.id,
      type: 'mern',
      source: 'local',
      questionId: metadata.id || problem.id,
      title: metadata.title || problem.title,
      titleSlug: metadata.id || problem.id,
      difficulty: 'MERN',
      tags: Array.isArray(metadata.tags) ? metadata.tags : ['dev', 'bugfix'],
      content: buildInstructionsHtml(metadata),
      instructions: Array.isArray(metadata.description) ? metadata.description : [],
      workspacePath: tempDir
    }
  };
}

async function openMernWorkspace(tempDir) {
  await vscode.commands.executeCommand(
    'vscode.openFolder',
    vscode.Uri.file(tempDir),
    true
  );
}

async function runMernTests(cwd) {
  return new Promise((resolve) => {
    exec('npm test', { cwd }, (error, stdout, stderr) => {
      const output = String(stdout || '') + '\n' + String(stderr || '');
      const cleanOutput = output.trim();
      
      if (error) {
        resolve({
          status: 'Failed',
          statusCode: -1,
          output: cleanOutput || error.message
        });
      } else {
        resolve({
          status: 'Passed',
          statusCode: 10,
          output: cleanOutput
        });
      }
    });
  });
}

module.exports = {
  createMernChallenge,
  openMernWorkspace,
  runMernTests
};
