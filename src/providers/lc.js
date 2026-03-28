const axios = require('axios');

const GRAPHQL_URL = 'https://leetcode.com/graphql';

const HEADERS = {
  'Content-Type': 'application/json',
  Referer: 'https://leetcode.com/problemset/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://leetcode.com'
};
async function fetchProblemList(difficulty = 'MEDIUM', skip = 0, limit = 50) {
  const query = `
    query problemsetQuestionList(
      $categorySlug: String
      $limit: Int
      $skip: Int
      $filters: QuestionListFilterInput
    ) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        total: totalNum
        questions: data {
          questionFrontendId
          titleSlug
          title
          difficulty
          acRate
          isPaidOnly
        }
      }
    }
  `;

  const { data } = await axios.post(
    GRAPHQL_URL,
    {
      query,
      variables: {
        categorySlug: 'all-code-essentials',
        skip,
        limit,
        filters: { difficulty }
      }
    },
    { headers: HEADERS, timeout: 10000 }
  );

  return data.data.problemsetQuestionList;
}

async function fetchProblemContent(titleSlug) {
  const query = `
    query questionContent($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        questionFrontendId
        title
        titleSlug
        difficulty
        content
        acRate
        codeSnippets {
          lang
          langSlug
          code
        }
        topicTags {
          name
          slug
        }
      }
    }
  `;

  const { data } = await axios.post(
    GRAPHQL_URL,
    { query, variables: { titleSlug } },
    { headers: HEADERS, timeout: 10000 }
  );

  return data.data.question;
}

function buildStarterCodeMap(codeSnippets = []) {
  return codeSnippets.reduce((map, snippet) => {
    if (snippet.langSlug && typeof snippet.code === 'string') {
      map[snippet.langSlug] = snippet.code;
    }
    return map;
  }, {});
}

async function fetchRandomProblem(difficulty = 'MEDIUM') {
  const listMeta = await fetchProblemList(difficulty, 0, 1);
  const total = listMeta.total;
  const maxSkip = Math.max(0, total - 50);
  const skip = Math.floor(Math.random() * maxSkip);
  const page = await fetchProblemList(difficulty, skip, 50);
  const candidates = page.questions.filter((question) => !question.isPaidOnly);

  if (candidates.length === 0) {
    throw new Error('No free problems found in this batch. Please retry.');
  }

  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  const full = await fetchProblemContent(picked.titleSlug);

  if (!full || !full.content) {
    throw new Error(`Problem "${picked.titleSlug}" has no content and may be premium-only.`);
  }

  return {
    type: 'lc',
    questionId: full.questionFrontendId,
    title: full.title,
    titleSlug: full.titleSlug,
    difficulty: full.difficulty,
    content: full.content,
    acRate: Math.round(full.acRate * 10) / 10,
    tags: (full.topicTags ?? []).map((tag) => tag.name),
    starterCode: buildStarterCodeMap(full.codeSnippets)
  };
}

const LANG_MAP = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python3',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  csharp: 'csharp',
  ruby: 'ruby',
  swift: 'swift',
  golang: 'golang',
  scala: 'scala',
  kotlin: 'kotlin',
  rust: 'rust',
  php: 'php'
};

function authHeaders(creds, referer) {
  return {
    ...HEADERS,
    Cookie: `LEETCODE_SESSION=${creds.session}; csrftoken=${creds.csrfToken}`,
    'X-CSRFToken': creds.csrfToken,
    Referer: referer,
    'x-requested-with': 'XMLHttpRequest'
  };
}

async function submitCode(creds, { titleSlug, questionId, code, language }) {
  const langSlug = LANG_MAP[language] ?? 'javascript';
  const url = `https://leetcode.com/problems/${titleSlug}/submit/`;

  const { data } = await axios.post(
    url,
    {
      lang: langSlug,
      question_id: questionId,
      typed_code: code
    },
    {
      headers: authHeaders(creds, `https://leetcode.com/problems/${titleSlug}/`),
      timeout: 15000
    }
  );

  if (!data?.submission_id) {
    const errorMessage = data?.error || data?.detail;
    throw new Error(
      errorMessage || 'LeetCode did not return a submission ID. Check your credentials.'
    );
  }

  return String(data.submission_id);
}

async function pollVerdict(creds, submissionId, maxAttempts = 20) {
  const url = `https://leetcode.com/submissions/detail/${submissionId}/check/`;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const { data } = await axios.get(url, {
      headers: authHeaders(creds, `https://leetcode.com/submissions/detail/${submissionId}/`),
      timeout: 10000
    });

    const status = data.status_msg ?? data.state ?? 'Pending';
    if (
      status === 'Pending' ||
      data.state === 'PENDING' ||
      data.state === 'STARTED'
    ) {
      continue;
    }

    return {
      submissionId,
      status: data.status_msg ?? 'Unknown',
      statusCode: data.status_code ?? 0,
      runtime: data.status_runtime ?? 'N/A',
      memory: data.status_memory ?? 'N/A',
      totalCorrect: data.total_correct ?? 0,
      totalTestcases: data.total_testcases ?? 0,
      lastTestcase: data.last_testcase,
      expectedOutput: data.expected_output,
      codeOutput: data.code_output
    };
  }

  throw new Error(`Verdict polling timed out after ${maxAttempts * 2}s. Check the LeetCode website.`);
}

module.exports = { fetchRandomProblem, submitCode, pollVerdict, LANG_MAP };
