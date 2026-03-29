import React, { useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { sendMessage, state } from '../bridge.js';

const EMPTY_EDITOR = '';

function getChallengeStateKey(challenge, langSlug) {
  return challenge ? `code:${challenge.id || challenge.questionId}:${langSlug}` : '';
}

export default function EditorPane({ challenge, challengeStartedAt, onMessage }) {
  const editorRef = useRef(null);
  const [currentLang, setCurrentLang] = useState('javascript');
  const [editorValue, setEditorValue] = useState(EMPTY_EDITOR);
  const [output, setOutput] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  // Default selection if available
  useEffect(() => {
    if (challenge?.supportedLanguages?.length) {
      if (!challenge.supportedLanguages.some(l => l.id === currentLang)) {
        setCurrentLang(challenge.supportedLanguages[0].id);
      }
    }
  }, [challenge]);

  const challengeStateKey = useMemo(() => getChallengeStateKey(challenge, currentLang), [challenge, currentLang]);

  useEffect(() => {
    const savedState = state.get();
    const restored = challengeStateKey ? savedState?.[challengeStateKey] : '';
    const nextValue = restored || challenge?.starterCode?.[currentLang] || EMPTY_EDITOR;

    setEditorValue(nextValue);
    if (editorRef.current) {
      editorRef.current.setValue(nextValue);
      // Change monaco model language if needed
      const monaco = window.monaco;
      if (monaco && editorRef.current.getModel()) {
        monaco.editor.setModelLanguage(editorRef.current.getModel(), currentLang === 'python3' ? 'python' : currentLang);
      }
    }
  }, [challengeStateKey, challenge?.starterCode, currentLang]);

  useEffect(() => onMessage((message) => {
    if (message?.type === 'executionOutput') {
      setOutput(message.data?.output || '');
    }

    if (message?.type === 'busy') {
      setIsBusy(Boolean(message.data?.message));
    }

    if (message?.type === 'challenge') {
      setOutput('');
    }
  }), [onMessage]);

  function persistEditorValue(nextValue) {
    setEditorValue(nextValue);
    if (!challengeStateKey) {
      return;
    }

    const snapshot = state.get();
    state.set({
      ...snapshot,
      [challengeStateKey]: nextValue
    });
  }

  function getElapsedSeconds() {
    if (!challengeStartedAt) {
      return 0;
    }

    return Math.max(0, Math.round((Date.now() - challengeStartedAt) / 1000));
  }

  return (
    <section className="workspace-pane">
      <div className="workspace-toolbar">
        <div>
          <div className="workspace-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>DSA Engine</span>
            {challenge?.supportedLanguages?.length > 0 && (
              <select className="lang-select" value={currentLang} onChange={e => setCurrentLang(e.target.value)}>
                {challenge.supportedLanguages.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="workspace-subtitle">All DSA execution stays inside the extension host, or uses LeetCode directly.</div>
        </div>
        <div className="workspace-actions">
          {isBusy ? (
            <button type="button" className="action-button action-button--ghost" onClick={() => sendMessage({ type: 'cancelRun' })}>
              Stop Running
            </button>
          ) : (
            <button type="button" className="action-button action-button--ghost" onClick={() => setOutput('')}>
              Clear Output
            </button>
          )}
          <button
            type="button"
            className="action-button action-button--ghost"
            onClick={() => sendMessage({ type: 'skipChallenge' })}
            disabled={!challenge || isBusy}
          >
            Skip Challenge
          </button>
          <button
            type="button"
            className="action-button action-button--ghost"
            onClick={() => sendMessage({ type: 'runDsa', code: editorRef.current?.getValue() || '', langSlug: currentLang, timerSeconds: getElapsedSeconds() })}
            disabled={!challenge || isBusy}
          >
            Run Samples
          </button>
          <button
            type="button"
            className="action-button"
            onClick={() => sendMessage({ type: 'submitDsa', code: editorRef.current?.getValue() || '', langSlug: currentLang, timerSeconds: getElapsedSeconds() })}
            disabled={!challenge || isBusy}
          >
            Submit
          </button>
        </div>
      </div>

      <div className="editor-frame">
        <Editor
          height="100%"
          language={currentLang === 'python3' ? 'python' : currentLang}
          value={editorValue}
          theme="vs-dark"
          onMount={(editor) => {
            editorRef.current = editor;
            editor.setValue(editorValue);
          }}
          options={{
            fontSize: 14,
            fontFamily: '"Google Sans Code", monospace',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2,
            smoothScrolling: true,
            padding: { top: 16, bottom: 16 }
          }}
          onChange={(value) => persistEditorValue(value ?? EMPTY_EDITOR)}
        />
      </div>

      <div className="console-panel">
        <div className="console-header">Extension Host Output</div>
        <pre className="console-body">{output || 'Run the sample tests to see SideChick feedback here.'}</pre>
      </div>
    </section>
  );
}
