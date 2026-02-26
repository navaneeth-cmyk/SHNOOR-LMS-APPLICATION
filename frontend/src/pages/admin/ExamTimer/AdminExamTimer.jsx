import React, { useEffect, useState } from "react";
import { auth } from "../../../auth/firebase";
import api from "../../../api/axios";

const AdminExamTimer = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch all exams
  const fetchExams = async () => {
    try {
      setLoading(true);
      setError("");

      const token = await auth.currentUser.getIdToken(true);

      const res = await api.get("/api/exams/admin", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setExams(res.data);
    } catch (err) {
      console.error("Error fetching exams:", err);
      setError("Failed to fetch exams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // Update timer
  const updateTimer = async (examId, newTime) => {
    try {
      if (!newTime || newTime <= 0) {
        alert("Please enter valid timer value");
        return;
      }

      const token = await auth.currentUser.getIdToken(true);

      await api.put(
        `/api/exams/admin/${examId}/grace-timer`,
        { disconnect_grace_time: Number(newTime) },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Timer updated successfully");
      fetchExams();
    } catch (err) {
      console.error("Error updating timer:", err);
      alert(err.response?.data?.message || "Failed to update timer");
    }
  };

  if (loading) return <h2>Loading exams...</h2>;

  return (
    <div style={{ padding: "30px" }}>
      <h2>Admin - Set Disconnect Grace Timer</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {exams.map((exam) => (
        <div
          key={exam.exam_id}
          style={{
            border: "1px solid #ddd",
            padding: "15px",
            marginBottom: "15px",
            borderRadius: "8px",
          }}
        >
          <h3>{exam.title}</h3>
          <p>Duration: {exam.duration} mins</p>
          <p>
            Current Grace Timer:{" "}
            <strong>{exam.disconnect_grace_time} seconds</strong>
          </p>

          <input
            type="number"
            placeholder="Enter new timer (seconds)"
            id={`timer-${exam.exam_id}`}
            style={{ marginRight: "10px" }}
          />

          <button
            onClick={() => {
              const value = document.getElementById(
                `timer-${exam.exam_id}`
              ).value;
              updateTimer(exam.exam_id, value);
            }}
          >
            Update Timer
          </button>
        </div>
      ))}
    </div>
  );
};

export default AdminExamTimer;
