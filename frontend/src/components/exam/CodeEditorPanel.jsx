{/*import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { FaCog, FaExpand, FaPlay, FaSave, FaPaperPlane } from 'react-icons/fa';

const CodeEditorPanel = ({ question, startCode, language, onLanguageChange, onCodeChange, onRun, onSubmit, isRunning, consoleOutput }) => {
    const [activeTab, setActiveTab] = useState('testcases');

    const handleEditorChange = (value) => {
        onCodeChange(value);
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#333]">
            { }
            <div className="flex justify-between items-center px-4 py-2 bg-[#252526] border-b border-[#333]">
                <div className="flex items-center gap-2">
                    <span role="img" aria-label="code" className="text-sm">💻</span>
                    <select
                        value={language}
                        onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}
                        className="bg-transparent border-none text-sm font-semibold text-slate-200 focus:outline-none cursor-pointer"
                    >
                        <option value="javascript" className="text-black">JavaScript</option>
                        <option value="python" className="text-black">Python</option>
                        <option value="java" className="text-black">Java</option>
                        <option value="cpp" className="text-black">C++</option>
                        <option value="go" className="text-black">Go</option>
                    </select>
                </div>
                <div className="flex gap-2 text-slate-400">
                    <button className="p-1 hover:text-white transition-colors" title="Settings"><FaCog /></button>
                    <button className="p-1 hover:text-white transition-colors" title="Fullscreen"><FaExpand /></button>
                </div>
            </div>

            { }
            <div className="flex-1 min-h-0">
                <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    language={language || 'javascript'}
                    value={startCode}
                    onChange={handleEditorChange}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16 },
                        fontFamily: "'Fira Code', 'Consolas', monospace"
                    }}
                />
            </div>

            <div className="h-50 flex flex-col bg-[#1e1e1e] border-t border-[#333]">
                <div className="flex border-b border-[#333] bg-[#252526]">
                    <div
                        className={`px-4 py-2 text-xs font-bold uppercase cursor-pointer transition-colors ${activeTab === 'testcases' ? 'bg-[#1e1e1e] text-blue-400 border-t-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                        onClick={() => setActiveTab('testcases')}
                    >
                        Test Cases
                    </div>
                    <div
                        className={`px-4 py-2 text-xs font-bold uppercase cursor-pointer transition-colors ${activeTab === 'console' ? 'bg-[#1e1e1e] text-blue-400 border-t-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                        onClick={() => setActiveTab('console')}
                    >
                        Console
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 text-sm font-mono text-slate-300">
                    {activeTab === 'testcases' && (
                        <div>
                            {(question.testCases || []).filter(tc => tc.isPublic).map((tc, idx) => (
                                <div key={idx} className="mb-4 last:mb-0">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Input</div>
                                    <div className="bg-[#2d2d2d] p-2 rounded mb-2 border border-[#444]">{tc.input}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Expected Output</div>
                                    <div className="bg-[#2d2d2d] p-2 rounded border border-[#444]">{tc.output}</div>
                                </div>
                            ))}
                            {(question.testCases || []).filter(tc => tc.isPublic).length === 0 && (
                                <div className="text-gray-500 italic">No public test cases.</div>
                            )}
                        </div>
                    )}

                    {activeTab === 'console' && (
                        <div className="space-y-1">
                            {consoleOutput.length === 0 && <div className="text-gray-500 italic">&gt; Run code to see logging output...</div>}
                            {consoleOutput.map((log, i) => (
                                <div key={i} className="flex gap-2 items-start font-mono text-xs">
                                    <span className={log.type === 'error' ? 'text-red-500' : 'text-emerald-500'}>
                                        {log.type === 'error' ? '⨯' : '✓'}
                                    </span>
                                    <span className={`${log.type === 'error' ? 'text-red-300' : 'text-emerald-300'} whitespace-pre-wrap`}>{log.msg}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            { }
            <div className="p-3 bg-[#252526] border-t border-[#333] flex justify-end gap-3">
                <button className="flex items-center gap-2 px-4 py-1.5 bg-[#333] text-slate-300 rounded hover:bg-[#444] transition-colors text-sm font-bold">
                    <FaSave /> Save
                </button>
                <button
                    className={`flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed`}
                    onClick={onRun}
                    disabled={isRunning}
                >
                    {isRunning ? 'Running...' : <><FaPlay size={12} /> Run</>}
                </button>
                <button className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-bold" onClick={onSubmit}>
                    <FaPaperPlane size={12} /> Submit
                </button>
            </div>
        </div>
    );
};

export default CodeEditorPanel;*/}


import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { FaCog, FaExpand, FaPlay, FaSave, FaPaperPlane } from 'react-icons/fa';

const CodeEditorPanel = ({
  question,
  startCode,
  language,
  onLanguageChange,
  onCodeChange,
  onRun,
  onSubmit,
  isRunning,
  consoleOutput
}) => {
  const [activeTab, setActiveTab] = useState('testcases');
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  /* 🔒 Detect function signature lines */
  const getReadOnlyRanges = (code) => {
    const lines = code.split('\n');
    const ranges = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // JS / Java / C++
      if (
        trimmed.startsWith('function ') ||
        trimmed.startsWith('def ') ||
        trimmed.startsWith('public ') ||
        trimmed.startsWith('#include')
      ) {
        ranges.push({
          startLineNumber: index + 1,
          endLineNumber: index + 1,
          startColumn: 1,
          endColumn: line.length + 1
        });
      }
    });

    return ranges;
  };

  /* 🔒 Lock function signature */
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const model = editor.getModel();
    if (!model || !startCode) return;

    const ranges = getReadOnlyRanges(startCode);

    // Decoration = read-only lines
    editor.createDecorationsCollection(
      ranges.map(r => ({
        range: new monaco.Range(
          r.startLineNumber,
          r.startColumn,
          r.endLineNumber,
          r.endColumn
        ),
        options: {
          isWholeLine: true,
          className: 'read-only-line',
          stickiness:
            monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      }))
    );

    // Prevent editing those lines
    editor.onDidChangeModelContent((event) => {
      for (const change of event.changes) {
        const line = change.range.startLineNumber;
        if (ranges.some(r => r.startLineNumber === line)) {
          editor.executeEdits('', [
            {
              range: change.range,
              text: '',
              forceMoveMarkers: true
            }
          ]);
        }
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#333]">

      {/* Header */}
      <div className="flex justify-between items-center px-4 py-2 bg-[#252526] border-b border-[#333]">
        <div className="flex items-center gap-2">
          <span role="img" aria-label="code">💻</span>
          <select
            value={language}
            onChange={(e) => onLanguageChange?.(e.target.value)}
            className="bg-transparent border-none text-sm font-semibold text-slate-200 focus:outline-none"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
        </div>
        <div className="flex gap-2 text-slate-400">
          <FaCog />
          <FaExpand />
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          value={startCode}
          onChange={onCodeChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontFamily: "'Fira Code', monospace"
          }}
        />
      </div>

      {/* Bottom panel */}
      <div className="h-48 bg-[#1e1e1e] border-t border-[#333]">
        <div className="flex border-b border-[#333] bg-[#252526]">
          <div
            className={`px-4 py-2 text-xs font-bold cursor-pointer ${
              activeTab === 'testcases' ? 'text-blue-400' : 'text-slate-500'
            }`}
            onClick={() => setActiveTab('testcases')}
          >
            Test Cases
          </div>
          <div
            className={`px-4 py-2 text-xs font-bold cursor-pointer ${
              activeTab === 'console' ? 'text-blue-400' : 'text-slate-500'
            }`}
            onClick={() => setActiveTab('console')}
          >
            Console
          </div>
        </div>

        <div className="p-3 text-xs text-slate-300 overflow-y-auto">
          {activeTab === 'console' &&
            consoleOutput.map((log, i) => (
              <div key={i} className={log.type === 'error' ? 'text-red-400' : 'text-green-400'}>
                {log.msg}
              </div>
            ))}
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 bg-[#252526] border-t border-[#333] flex justify-end gap-3">
        <button onClick={onRun} disabled={isRunning} className="bg-emerald-600 px-4 py-1.5 rounded text-white">
          <FaPlay /> Run
        </button>
        <button onClick={onSubmit} className="bg-blue-600 px-4 py-1.5 rounded text-white">
          <FaPaperPlane /> Submit
        </button>
      </div>
    </div>
  );
};

export default CodeEditorPanel;
