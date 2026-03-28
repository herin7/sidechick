import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';

const EMPTY_EDITOR = '';

function resolveStarterCode(problem, language) {
  if (!problem?.starterCode) {
    return EMPTY_EDITOR;
  }

  const mappedLanguage =
    language === 'python'
      ? 'python3'
      : language;

  return problem.starterCode[mappedLanguage] ?? EMPTY_EDITOR;
}

export default function EditorPane({
  problem,
  challengeStartedAt,
  onRun,
  onSubmit,
  onMessage
}) {
  const editorRef = useRef(null);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [language, setLanguage] = useState('javascript');
  const [editorValue, setEditorValue] = useState(EMPTY_EDITOR);

  useEffect(() => {
    const cleanup = onMessage((data) => {
      if (data?.type === 'result') {
        setOutput(data.output);
        setIsRunning(false);
      } else if (data?.type === 'submitting') {
        setIsSubmitting(true);
      } else if (data?.type === 'verdict') {
        setIsSubmitting(false);
      }
    });

    return cleanup;
  }, [onMessage]);

  useEffect(() => {
    const nextValue = resolveStarterCode(problem, language);
    setEditorValue(nextValue);
    if (editorRef.current) {
      editorRef.current.setValue(nextValue);
    }
  }, [problem?.questionId, language]);

  const getCode = () => editorRef.current?.getValue() ?? '';

  const getElapsedSeconds = () => {
    if (!challengeStartedAt) {
      return 0;
    }

    return Math.max(0, Math.round((Date.now() - challengeStartedAt) / 1000));
  };

  const handleRun = () => {
    setIsRunning(true);
    setOutput('Running...');
    onRun(getCode());
  };

  const handleSubmit = () => {
    if (!problem) {
      return;
    }

    setIsSubmitting(true);
    onSubmit({
      code: getCode(),
      language,
      questionId: problem.questionId,
      timerSeconds: getElapsedSeconds()
    });
  };

  return (
    <section className="editor-pane">
      <div className="editor-toolbar">
        <select
          className="lang-select"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="typescript">TypeScript</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
        </select>

        <div className="toolbar-actions">
          <button
            className="btn btn--secondary"
            onClick={() => setOutput('')}
            title="Clear output"
            type="button"
          >
            Clear
          </button>
          <button
            className="btn btn--secondary"
            onClick={handleRun}
            disabled={isRunning || isSubmitting}
            title="Run code"
            type="button"
          >
            {isRunning ? 'Running...' : 'Run'}
          </button>
          <button
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={!problem || isSubmitting}
            title="Submit challenge"
            type="button"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>

      <div className="monaco-wrapper">
        <Editor
          height="100%"
          language={language}
          value={editorValue}
          theme="vs-dark"
          onMount={(editor) => {
            editorRef.current = editor;
            editor.setValue(editorValue);
          }}
          options={{
            fontSize: 14,
            fontFamily: "'Azeret Mono', monospace",
            fontLigatures: false,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            padding: { top: 16, bottom: 16 }
          }}
          onChange={(value) => {
            setEditorValue(value ?? EMPTY_EDITOR);
          }}
        />
      </div>

      <div className={`output-panel ${output ? 'output-panel--visible' : ''}`}>
        <div className="output-header">
          <span>Output</span>
          {output ? (
            <button className="output-close" onClick={() => setOutput('')} type="button">
              x
            </button>
          ) : null}
        </div>
        <pre className="output-content">{output || 'Run or submit to see output here.'}</pre>
      </div>
    </section>
  );
}
