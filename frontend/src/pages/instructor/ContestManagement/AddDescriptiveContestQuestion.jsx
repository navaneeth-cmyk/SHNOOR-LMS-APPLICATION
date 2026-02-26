import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axios";

const AddDescriptiveContestQuestion = () => {
  const { contestId } = useParams();
  const navigate = useNavigate();

  const [questionText, setQuestionText] = useState("");
  const [marks, setMarks] = useState(1);
  const [keywordsText, setKeywordsText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!questionText.trim()) {
      alert("Please enter question");
      return;
    }

    // convert comma separated text → array
    const keywords = keywordsText
      .split(",")
      .map(k => k.trim())
      .filter(Boolean);

    try {
      setSaving(true);

      await api.post(
        `/api/contests/${contestId}/questions/descriptive`,
        {
          questionText,
          marks,
          keywords
        }
      );

      alert("Descriptive question added");

      // clear form for next question
      setQuestionText("");
      setMarks(1);
      setKeywordsText("");

    } catch (err) {
      console.error(err);
      alert("Failed to add descriptive question");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl p-6 space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Add Descriptive Question
        </h1>

        <button
          onClick={() => navigate(-1)}
          className="text-blue-600"
        >
          Back
        </button>
      </div>

      {/* Question */}
      <div className="space-y-2">
        <label className="font-medium">Question</label>
        <textarea
          className="w-full border rounded p-2"
          rows={4}
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
        />
      </div>

      {/* Marks */}
      <div className="space-y-2">
        <label className="font-medium">Marks</label>
        <input
          type="number"
          min="1"
          className="w-full border rounded p-2"
          value={marks}
          onChange={(e) => setMarks(Number(e.target.value))}
        />
      </div>

      {/* Keywords */}
      <div className="space-y-2">
        <label className="font-medium">
          Keywords (comma separated)
        </label>
        <input
          type="text"
          className="w-full border rounded p-2"
          placeholder="ai, ml, data"
          value={keywordsText}
          onChange={(e) => setKeywordsText(e.target.value)}
        />
        <p className="text-sm text-slate-500">
          Used later for auto evaluation
        </p>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-indigo-600 text-white rounded"
        >
          {saving ? "Saving..." : "Save Question"}
        </button>

        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2 border rounded"
        >
          Done
        </button>
      </div>

    </div>
  );
};

export default AddDescriptiveContestQuestion;