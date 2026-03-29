const { Script, createContext } = require('vm');
const { isDeepStrictEqual } = require('util');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildContentHtml(problem) {
  const examplesHtml = problem.examples.map((example, index) => `
    <div class="example-block">
      <div class="example-title">Example ${index + 1}</div>
      <p><strong>Input:</strong> <code>${escapeHtml(example.inputLabel)}</code></p>
      <p><strong>Output:</strong> <code>${escapeHtml(example.outputLabel)}</code></p>
      <p>${escapeHtml(example.explanation)}</p>
    </div>
  `).join('');

  const constraintsHtml = problem.constraints
    .map((constraint) => `<li>${escapeHtml(constraint)}</li>`)
    .join('');

  return `
    <p>${escapeHtml(problem.prompt)}</p>
    ${examplesHtml}
    <h3>Constraints</h3>
    <ul>${constraintsHtml}</ul>
  `;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const LOCAL_DSA_PROBLEMS = [
  {
    id: 'two-sum-shift',
    questionId: 'SC-101',
    type: 'lc',
    title: 'Two Sum Shift',
    titleSlug: 'two-sum-shift',
    difficulty: 'EASY',
    tags: ['array', 'hash map'],
    prompt:
      'Return the indices of the two numbers whose sum equals the target. Exactly one valid answer exists, and you may not reuse the same element twice.',
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9'
    ],
    examples: [
      {
        inputLabel: 'nums = [2,7,11,15], target = 9',
        outputLabel: '[0,1]',
        explanation: 'nums[0] + nums[1] = 9.'
      },
      {
        inputLabel: 'nums = [3,2,4], target = 6',
        outputLabel: '[1,2]',
        explanation: 'The pair at indices 1 and 2 adds up to 6.'
      }
    ],
    starterCode: {
      javascript: `function twoSum(nums, target) {\n  // Return an array with the two matching indices.\n}\n\nmodule.exports = twoSum;\n`
    },
    entrypoint: 'twoSum',
    publicTests: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] }
    ],
    hiddenTests: [
      { args: [[3, 3], 6], expected: [0, 1] },
      { args: [[1, 5, 3, 7], 8], expected: [0, 3] }
    ]
  },
  {
    id: 'balanced-compiler-brackets',
    questionId: 'SC-202',
    type: 'cf',
    title: 'Balanced Compiler Brackets',
    titleSlug: 'balanced-compiler-brackets',
    difficulty: 'MEDIUM',
    tags: ['stack', 'strings'],
    prompt:
      'Given a string containing only (), [], and {}, return true if every opening bracket is closed in the correct order. Return false otherwise.',
    constraints: [
      '1 <= sequence.length <= 10^4',
      'The input string contains only bracket characters.'
    ],
    examples: [
      {
        inputLabel: 'sequence = "()[]{}"',
        outputLabel: 'true',
        explanation: 'Each bracket pair closes in the right order.'
      },
      {
        inputLabel: 'sequence = "([)]"',
        outputLabel: 'false',
        explanation: 'The middle pair crosses over and breaks the stack order.'
      }
    ],
    starterCode: {
      javascript: `function isBalanced(sequence) {\n  // Return true when the bracket sequence is valid.\n}\n\nmodule.exports = isBalanced;\n`
    },
    entrypoint: 'isBalanced',
    publicTests: [
      { args: ['()[]{}'], expected: true },
      { args: ['([)]'], expected: false }
    ],
    hiddenTests: [
      { args: ['{[]}'], expected: true },
      { args: ['((('], expected: false }
    ]
  },
  {
    id: 'merge-busy-intervals',
    questionId: 'SC-303',
    type: 'lc',
    title: 'Merge Busy Intervals',
    titleSlug: 'merge-busy-intervals',
    difficulty: 'MEDIUM',
    tags: ['sorting', 'intervals'],
    prompt:
      'Merge overlapping intervals and return the condensed list sorted by start time.',
    constraints: [
      '1 <= intervals.length <= 10^4',
      'Each interval has exactly two integers [start, end].'
    ],
    examples: [
      {
        inputLabel: 'intervals = [[1,3],[2,6],[8,10],[15,18]]',
        outputLabel: '[[1,6],[8,10],[15,18]]',
        explanation: 'The first two intervals overlap and should be merged.'
      },
      {
        inputLabel: 'intervals = [[1,4],[4,5]]',
        outputLabel: '[[1,5]]',
        explanation: 'Touching intervals are considered overlapping here.'
      }
    ],
    starterCode: {
      javascript: `function mergeIntervals(intervals) {\n  // Return a new array of merged intervals.\n}\n\nmodule.exports = mergeIntervals;\n`
    },
    entrypoint: 'mergeIntervals',
    publicTests: [
      {
        args: [[[1, 3], [2, 6], [8, 10], [15, 18]]],
        expected: [[1, 6], [8, 10], [15, 18]]
      },
      {
        args: [[[1, 4], [4, 5]]],
        expected: [[1, 5]]
      }
    ],
    hiddenTests: [
      {
        args: [[[5, 7], [1, 2], [2, 4]]],
        expected: [[1, 4], [5, 7]]
      }
    ]
  }
];

function normalizeProblem(problem) {
  return {
    ...problem,
    source: 'local',
    content: buildContentHtml(problem),
    supportedLanguages: ['javascript']
  };
}

function normalizeRemoteProblem(problem) {
  if (!problem || typeof problem !== 'object') {
    return null;
  }

  const metadata = problem.metadata && typeof problem.metadata === 'object'
    ? problem.metadata
    : null;

  if (
    !metadata ||
    typeof metadata.contentHtml !== 'string' ||
    typeof metadata.entrypoint !== 'string' ||
    !metadata.starterCode ||
    !Array.isArray(metadata.publicTests)
  ) {
    return null;
  }

  return {
    id: String(problem.slug || problem.id),
    questionId: String(problem.id),
    type: String(problem.type || 'lc'),
    title: String(problem.title || 'SideChick Challenge'),
    titleSlug: String(problem.slug || problem.id),
    difficulty: String(problem.difficulty || 'MEDIUM').toUpperCase(),
    tags: Array.isArray(metadata.tags) ? metadata.tags : [],
    content: metadata.contentHtml,
    source: 'cloud',
    starterCode: metadata.starterCode,
    supportedLanguages: ['javascript'],
    entrypoint: metadata.entrypoint,
    publicTests: metadata.publicTests,
    hiddenTests: Array.isArray(metadata.hiddenTests) ? metadata.hiddenTests : []
  };
}

async function fetchRandomProblem(preferredType = 'lc') {
  const pool = LOCAL_DSA_PROBLEMS.filter((problem) => problem.type === preferredType);
  const source = pool.length > 0 ? pool : LOCAL_DSA_PROBLEMS;
  return normalizeProblem(source[Math.floor(Math.random() * source.length)]);
}

function loadSolution(code, entrypoint) {
  const logs = [];
  const sandbox = {
    module: { exports: undefined },
    exports: {},
    console: {
      log: (...args) => {
        logs.push(args.map((value) => {
          if (typeof value === 'string') {
            return value;
          }

          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        }).join(' '));
      }
    }
  };

  const context = createContext(sandbox);
  const script = new Script(
    `${code}\n;if (typeof module.exports !== 'function' && typeof ${entrypoint} !== 'undefined') { module.exports = ${entrypoint}; }`,
    { filename: 'sidechick-dsa.js' }
  );
  script.runInContext(context, { timeout: 1000 });

  const solution = sandbox.module.exports ?? sandbox.exports;
  if (typeof solution !== 'function') {
    throw new Error(`Export a function named "${entrypoint}" using module.exports.`);
  }

  return { solution, logs };
}

async function executeTests(problem, code, { publicOnly }) {
  const tests = publicOnly
    ? problem.publicTests
    : [...problem.publicTests, ...problem.hiddenTests];

  const { solution, logs } = loadSolution(code, problem.entrypoint);
  const results = [];

  for (const [index, test] of tests.entries()) {
    const actual = await Promise.resolve(solution(...clone(test.args)));
    const passed = isDeepStrictEqual(actual, test.expected);

    results.push({
      index: index + 1,
      args: test.args,
      expected: test.expected,
      actual,
      passed
    });

    if (!passed && !publicOnly) {
      break;
    }
  }

  return { logs, results };
}

function buildRunOutput(problem, execution) {
  const lines = [`Running sample checks for ${problem.title}:`, ''];

  execution.results.forEach((result) => {
    lines.push(`Sample ${result.index}: ${result.passed ? 'PASS' : 'FAIL'}`);
    lines.push(`  input: ${JSON.stringify(result.args)}`);
    lines.push(`  expected: ${JSON.stringify(result.expected)}`);
    lines.push(`  actual: ${JSON.stringify(result.actual)}`);
  });

  if (execution.logs.length > 0) {
    lines.push('', 'console.log output:');
    lines.push(...execution.logs.map((line) => `  ${line}`));
  }

  return lines.join('\n');
}

function buildVerdict(execution) {
  const failing = execution.results.find((result) => !result.passed);
  const accepted = !failing;

  return {
    status: accepted ? 'Accepted' : 'Failed',
    statusCode: accepted ? 10 : -1,
    runtime: 'Local evaluator',
    memory: 'N/A',
    output: accepted
      ? 'All SideChick test cases passed.'
      : `Failed test ${failing.index}: expected ${JSON.stringify(failing.expected)} but received ${JSON.stringify(failing.actual)}.`,
    error: accepted ? undefined : 'Check your edge cases and try again.',
    totalCorrect: execution.results.filter((result) => result.passed).length,
    totalTestcases: execution.results.length
  };
}

async function evaluateSolution(problem, code, { publicOnly = false } = {}) {
  const execution = await executeTests(problem, code, { publicOnly });

  return {
    output: buildRunOutput(problem, execution),
    verdict: buildVerdict(execution)
  };
}

module.exports = {
  evaluateSolution,
  fetchRandomProblem,
  normalizeRemoteProblem
};
