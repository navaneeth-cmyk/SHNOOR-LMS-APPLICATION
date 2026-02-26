import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api/axios";

const AddCodingContestQuestion = () => {
  const { contestId } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("python");
  const [starterCode, setStarterCode] = useState("");
  const [marks, setMarks] = useState(1);

  const [testCases, setTestCases] = useState([
    { input: "", expected_output: "", is_hidden: false }
  ]);

  const [saving, setSaving] = useState(false);

  const addTestCase = () => {
    setTestCases((p) => [
      ...p,
      { input: "", expected_output: "", is_hidden: false }
    ]);
  };

  const updateTC = (index, field, value) => {
    const copy = [...testCases];
    copy[index][field] = value;
    setTestCases(copy);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Title required");
      return;
    }

    try {
      setSaving(true);

      await api.post(
        `/api/contests/${contestId}/questions/coding`,
        {
          title,
          description,
          language,
          starterCode,
          marks,
          testCases
        }
      );

      alert("Coding question added");

      navigate(-1);

    } catch (err) {
      console.error(err);
      alert("Failed to add coding question");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl p-6 space-y-5">

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Add Coding Question</h2>

        <button
          onClick={() => navigate(-1)}
          className="text-blue-600"
        >
          Back
        </button>
      </div>

      <div>
        <label className="font-medium">Title</label>
        <input
          className="w-full border rounded p-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="font-medium">Description</label>
        <textarea
          rows={4}
          className="w-full border rounded p-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">

        <div>
          <label className="font-medium">Language</label>
          <select
            className="w-full border rounded p-2"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>
        </div>

        <div>
          <label className="font-medium">Marks</label>
          <input
            type="number"
            className="w-full border rounded p-2"
            value={marks}
            onChange={(e) => setMarks(Number(e.target.value))}
          />
        </div>

      </div>

      <div>
        <label className="font-medium">Starter Code</label>
        <textarea
          rows={6}
          className="w-full border rounded p-2 font-mono"
          value={starterCode}
          onChange={(e) => setStarterCode(e.target.value)}
        />
      </div>

      <div className="space-y-3">

        <label className="font-medium">
          Test cases
        </label>

        {testCases.map((tc, i) => (
          <div
            key={i}
            className="border rounded p-3 space-y-2"
          >

            <input
              className="w-full border rounded p-2"
              placeholder="Input"
              value={tc.input}
              onChange={(e) =>
                updateTC(i, "input", e.target.value)
              }
            />

            <input
              className="w-full border rounded p-2"
              placeholder="Expected output"
              value={tc.expected_output}
              onChange={(e) =>
                updateTC(i, "expected_output", e.target.value)
              }
            />

            <label className="flex gap-2 items-center text-sm">
              <input
                type="checkbox"
                checked={tc.is_hidden}
                onChange={(e) =>
                  updateTC(i, "is_hidden", e.target.checked)
                }
              />
              Hidden test case
            </label>

          </div>
        ))}

        <button
          type="button"
          onClick={addTestCase}
          className="text-green-600 text-sm"
        >
          + Add test case
        </button>

      </div>

      <div className="pt-4 flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-indigo-600 text-white rounded"
        >
          {saving ? "Saving..." : "Save Coding Question"}
        </button>

        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2 border rounded"
        >
          Cancel
        </button>
      </div>

    </div>
  );
};

export default AddCodingContestQuestion;