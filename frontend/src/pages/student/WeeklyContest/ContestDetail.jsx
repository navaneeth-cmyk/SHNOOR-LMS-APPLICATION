import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api/axios";
import Editor from "@monaco-editor/react";

const ContestDetail = () => {

  const { contestId } = useParams();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentIndex, setCurrentIndex] = useState(0);

  const [answers, setAnswers] = useState({});
  const [codingMeta, setCodingMeta] = useState({});
  const [runResult, setRunResult] = useState({});
  const [result, setResult] = useState(null);

  const [selectedLanguage, setSelectedLanguage] = useState({});

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const res = await api.get(
          `/api/contests/${contestId}/questions`
        );
        setQuestions(res.data);
      } catch (err) {
        console.error("Failed to load contest questions", err);
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [contestId]);

  const loadCodingMeta = async (questionId) => {
    try {
      const res = await api.get(
        `/api/contests/questions/coding/${questionId}/meta`
      );

      setCodingMeta((prev) => ({
        ...prev,
        [questionId]: res.data
      }));

      setAnswers((prev) => ({
        ...prev,
        [questionId]: res.data.starterCode || ""
      }));

      setSelectedLanguage((prev) => ({
        ...prev,
        [questionId]: res.data.language || "python"
      }));

    } catch (e) {
      console.error("Failed to load coding meta", e);
    }
  };

  const runCode = async (questionId) => {
    try {
      const lang = selectedLanguage[questionId];

      const res = await api.post(
        `/api/contests/${contestId}/run-question/${questionId}`,
        {
          code: answers[questionId],
          language: lang
        }
      );

      setRunResult((prev) => ({
        ...prev,
        [questionId]: res.data
      }));

    } catch (e) {
      alert("Run failed");
    }
  };

  const handleSubmit = async () => {
    try {
      const res = await api.post(
        `/api/contests/${contestId}/submit`,
        { answers }
      );
      setResult(res.data);
    } catch (err) {
      alert("Failed to submit");
    }
  };

  if (loading) return <div className="p-6">Loading questions...</div>;
  if (!questions.length) return <div className="p-6">No questions</div>;

  const q = questions[currentIndex];
  const meta = codingMeta[q.question_id];
  const lang = selectedLanguage[q.question_id];

  return (
    <div className="p-6 space-y-6">

      <div className="text-sm text-slate-500">
        Question {currentIndex + 1} of {questions.length}
      </div>

      <div className="border rounded-xl p-5 space-y-4">

        <div className="font-semibold">
          {currentIndex + 1}. {q.question_text}
          <span className="ml-2 text-xs text-slate-500">
            ({q.question_type})
          </span>
        </div>

        {/* MCQ */}
        {q.question_type === "mcq" && (
          <div className="space-y-2">
            {q.options.map((opt) => (
              <label key={opt.option_id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={q.question_id}
                  checked={answers[q.question_id] === opt.option_id}
                  onChange={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      [q.question_id]: opt.option_id
                    }))
                  }
                />
                <span>{opt.option_text}</span>
              </label>
            ))}
          </div>
        )}

        {/* DESCRIPTIVE */}
        {q.question_type === "descriptive" && (
          <textarea
            className="w-full border rounded p-2"
            rows={5}
            value={answers[q.question_id] || ""}
            onChange={(e) =>
              setAnswers((prev) => ({
                ...prev,
                [q.question_id]: e.target.value
              }))
            }
          />
        )}

        {/* CODING */}
        {q.question_type === "coding" && (
          <>
            {!meta && (
              <button
                onClick={() => loadCodingMeta(q.question_id)}
                className="px-3 py-1 border rounded"
              >
                Load problem
              </button>
            )}

            {meta && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* LEFT */}
                <div className="border rounded p-3 space-y-3">

                  <div className="flex items-center gap-2">
                    <b>Language</b>
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={lang}
                      onChange={(e) =>
                        setSelectedLanguage((prev) => ({
                          ...prev,
                          [q.question_id]: e.target.value
                        }))
                      }
                    >
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="javascript">JavaScript</option>
                      <option value="c">C</option>
                      <option value="cpp">C++</option>
                    </select>
                  </div>

                  <div>
                    <b>Description</b>
                    <div className="whitespace-pre-wrap text-sm mt-1">
                      {meta.description}
                    </div>
                  </div>

                  <div>
                    <b>Test cases</b>
                    <div className="space-y-2 mt-2">
                      {meta.testcases.map((tc, i) => (
                        <div
                          key={i}
                          className="text-xs border rounded p-2 bg-slate-50"
                        >
                          <div><b>Input:</b> {tc.input}</div>
                          {!tc.is_hidden ? (
                            <div><b>Expected:</b> {tc.expected_output}</div>
                          ) : (
                            <div className="italic text-slate-400">
                              Hidden test case
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="border rounded overflow-hidden">

                  <div className="flex justify-between items-center px-3 py-2 bg-slate-50 border-b">
                    <b>Editor</b>
                  </div>

                  <Editor
                    height="320px"
                    language={
                      lang === "python" ? "python" :
                      lang === "java" ? "java" :
                      lang === "c" ? "c" :
                      lang === "cpp" ? "cpp" :
                      "javascript"
                    }
                    value={answers[q.question_id] || ""}
                    onChange={(v) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [q.question_id]: v || ""
                      }))
                    }
                    theme="vs-dark"
                  />

                  <div className="p-2">
                    <button
                      onClick={() => runCode(q.question_id)}
                      className="px-3 py-1 bg-slate-800 text-white rounded"
                    >
                      Run
                    </button>
                  </div>

                  {runResult[q.question_id] && (
                    <div className="p-3 text-sm border-t bg-slate-50">
                      {runResult[q.question_id].testResults.map((t, i) => (
                        <div key={i}>
                          Test {t.testCaseNumber} : {t.passed ? "✅" : "❌"}
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            )}
          </>
        )}

      </div>

      <div className="flex justify-between">

        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
          className="px-4 py-2 border rounded disabled:opacity-40"
        >
          Previous
        </button>

        {currentIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="px-4 py-2 border rounded"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Submit contest
          </button>
        )}
      </div>

      {result && (
        <div className="p-4 border rounded bg-green-50">
          <div><b>Total Marks :</b> {result.totalMarks}</div>
          <div><b>Obtained Marks :</b> {result.obtainedMarks}</div>
        </div>
      )}

    </div>
  );
};

export default ContestDetail;