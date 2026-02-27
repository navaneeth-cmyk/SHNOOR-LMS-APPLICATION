/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api/axios";
import Editor from "@monaco-editor/react";

// Fisher-Yates shuffle — returns a new shuffled copy
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const SECTION_CONFIG = {
  mcq: { label: "MCQ", color: "bg-indigo-600", ring: "ring-indigo-400", badge: "bg-indigo-100 text-indigo-700" },
  descriptive: { label: "Descriptive", color: "bg-emerald-600", ring: "ring-emerald-400", badge: "bg-emerald-100 text-emerald-700" },
  coding: { label: "Coding", color: "bg-amber-600", ring: "ring-amber-400", badge: "bg-amber-100 text-amber-700" },
};

const ContestDetail = () => {

  const { contestId } = useParams();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeSection, setActiveSection] = useState("mcq");
  const [sectionIndex, setSectionIndex] = useState(0);

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

        // Shuffle questions and MCQ options for randomised order per student
        let qs = shuffle(res.data);
        qs = qs.map((q) => {
          if (q.question_type === "mcq" && Array.isArray(q.options)) {
            return { ...q, options: shuffle(q.options) };
          }
          return q;
        });

        setQuestions(qs);

        // Auto-select the first section that has questions
        const types = ["mcq", "descriptive", "coding"];
        const firstType = types.find(t => qs.some(q => q.question_type === t));
        if (firstType) setActiveSection(firstType);
      } catch (err) {
        console.error("Failed to load contest questions", err);
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, [contestId]);

  // Group questions by type
  const sections = useMemo(() => {
    return {
      mcq: questions.filter(q => q.question_type === "mcq"),
      descriptive: questions.filter(q => q.question_type === "descriptive"),
      coding: questions.filter(q => q.question_type === "coding"),
    };
  }, [questions]);

  // Available section keys (only those with questions)
  const availableSections = useMemo(() => {
    return ["mcq", "descriptive", "coding"].filter(t => sections[t].length > 0);
  }, [sections]);

  // Current section's questions
  const currentSectionQuestions = sections[activeSection] || [];
  const q = currentSectionQuestions[sectionIndex];

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
        [questionId]: "python"
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

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setSectionIndex(0);
  };

  if (loading) return <div className="p-6">Loading questions...</div>;
  if (!questions.length) return <div className="p-6">No questions</div>;

  const meta = q ? codingMeta[q.question_id] : null;
  const lang = q ? selectedLanguage[q.question_id] : "python";
  const cfg = SECTION_CONFIG[activeSection];

  return (
    <div className="p-6 space-y-6">

      {/* ===== SECTION TAB BAR ===== */}
      <div className="flex gap-2 flex-wrap">
        {availableSections.map((sKey) => {
          const sc = SECTION_CONFIG[sKey];
          const count = sections[sKey].length;
          const isActive = activeSection === sKey;
          const answeredCount = sections[sKey].filter(sq => answers[sq.question_id]).length;

          return (
            <button
              key={sKey}
              onClick={() => handleSectionChange(sKey)}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${isActive
                  ? `${sc.color} text-white shadow-md ring-2 ${sc.ring} ring-offset-1`
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              {sc.label}
              <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? "bg-white/20 text-white" : sc.badge
                }`}>
                {answeredCount}/{count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ===== SECTION HEADER ===== */}
      {q && (
        <>
          <div className="text-sm text-slate-500">
            {cfg.label} — Question {sectionIndex + 1} of {currentSectionQuestions.length}
          </div>

          <div className="border rounded-xl p-5 space-y-4">

            <div className="font-semibold">
              {sectionIndex + 1}. {q.question_text}
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${cfg.badge}`}>
                {cfg.label}
              </span>
            </div>

            {/* MCQ */}
            {q.question_type === "mcq" && (
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <label key={opt.option_id} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${answers[q.question_id] === opt.option_id
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                    }`}>
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
                      className="hidden"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${answers[q.question_id] === opt.option_id
                        ? "border-indigo-500 bg-indigo-500"
                        : "border-slate-300"
                      }`}>
                      {answers[q.question_id] === opt.option_id && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <span className={answers[q.question_id] === opt.option_id ? "font-bold text-indigo-700" : "text-slate-700"}>
                      {opt.option_text}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* DESCRIPTIVE */}
            {q.question_type === "descriptive" && (
              <textarea
                className="w-full border-2 border-slate-200 rounded-lg p-3 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                rows={5}
                placeholder="Type your answer here..."
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

          {/* ===== NAVIGATION ===== */}
          <div className="flex justify-between">

            <button
              disabled={sectionIndex === 0}
              onClick={() => setSectionIndex((i) => i - 1)}
              className="px-4 py-2 border rounded disabled:opacity-40"
            >
              Previous
            </button>

            {sectionIndex < currentSectionQuestions.length - 1 ? (
              <button
                onClick={() => setSectionIndex((i) => i + 1)}
                className="px-4 py-2 border rounded"
              >
                Next
              </button>
            ) : (
              // Last question of this section — go to next section or submit
              (() => {
                const currentSectionIdx = availableSections.indexOf(activeSection);
                const hasNextSection = currentSectionIdx < availableSections.length - 1;

                if (hasNextSection) {
                  return (
                    <button
                      onClick={() => handleSectionChange(availableSections[currentSectionIdx + 1])}
                      className={`px-4 py-2 text-white rounded ${SECTION_CONFIG[availableSections[currentSectionIdx + 1]].color}`}
                    >
                      Next Section → {SECTION_CONFIG[availableSections[currentSectionIdx + 1]].label}
                    </button>
                  );
                }

                return (
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Submit contest
                  </button>
                );
              })()
            )}
          </div>
        </>
      )}

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