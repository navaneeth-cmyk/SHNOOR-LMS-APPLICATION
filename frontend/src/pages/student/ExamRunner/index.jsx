/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "../../../auth/firebase";
import ExamRunnerView from "./view.jsx";
import api from "../../../api/axios";
import { onAuthStateChanged } from "firebase/auth";
import useExamSecurity from "../../../hooks/useExamSecurity";
import { io } from "socket.io-client";

const SECTION_CONFIG = {
  mcq: { label: "MCQ", color: "bg-indigo-600", ring: "ring-indigo-400", badge: "bg-indigo-100 text-indigo-700", icon: "📝" },
  descriptive: { label: "Descriptive", color: "bg-emerald-600", ring: "ring-emerald-400", badge: "bg-emerald-100 text-emerald-700", icon: "✍️" },
  coding: { label: "Coding", color: "bg-amber-600", ring: "ring-amber-400", badge: "bg-amber-100 text-amber-700", icon: "💻" },
};

// ✅ ALL VIOLATIONS & PROCTORING FULLY DISABLED
const EXAM_VIOLATIONS_DISABLED = true;
const PROCTORING_DISABLED = true;

const ExamRunner = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const parseServerTimestamp = (value) => {
    if (!value) return NaN;
    if (typeof value === "string") {
      const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
      return new Date(hasTimezone ? value : `${value}Z`).getTime();
    }
    return new Date(value).getTime();
  };

  const [exam, setExam] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canRewrite, setCanRewrite] = useState(false);
  const socketRef = useRef(null);

  // ✅ PROCTORING STATE — all inert/disabled
  const isProctored = false;
  const stream = null;
  const proctoringError = null;
  const isSuspicious = false;
  const isVoiceSuspicious = false;
  const multipleFacesDetected = false;
  const detections = [];
  const startCamera = () => {};

  // Server-authoritative timer state
  const [endTimeMs, setEndTimeMs] = useState(null);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [isExamLocked, setIsExamLocked] = useState(false);

  const answersRef = useRef(answers);
  answersRef.current = answers;

  /* =========================
     SECTION TABS STATE
  ========================= */
  const [activeSection, setActiveSection] = useState("mcq");
  const [sectionIndex, setSectionIndex] = useState(0);

  // Compute sections from exam questions
  const sections = useMemo(() => {
    if (!exam || !exam.questions) return { mcq: [], descriptive: [], coding: [] };
    return {
      mcq: exam.questions.filter(q => (q.type || q.question_type) === "mcq"),
      descriptive: exam.questions.filter(q => (q.type || q.question_type) === "descriptive"),
      coding: exam.questions.filter(q => (q.type || q.question_type) === "coding"),
    };
  }, [exam]);

  const availableSections = useMemo(() => {
    return ["mcq", "descriptive", "coding"].filter(t => sections[t].length > 0);
  }, [sections]);

  // Auto-select first available section when exam loads
  useEffect(() => {
    if (availableSections.length > 0 && !availableSections.includes(activeSection)) {
      setActiveSection(availableSections[0]);
      setSectionIndex(0);
    }
  }, [availableSections]);

  const handleSectionChange = (section) => {
    setActiveSection(section);
    setSectionIndex(0);
  };

  /* =========================
     LOAD EXAM FROM BACKEND
  ========================= */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      try {
        const token = await user.getIdToken(false);

        const res = await api.get(
          `/api/student/exams/${examId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const examData = res.data;
        setExam(examData);

        if (examData.duration > 0) {
          const attemptRes = await api.get(
            `/api/exams/${examId}/attempt`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          console.log("🔍 Attempt API Response:", attemptRes.data);

          const serverTime = parseServerTimestamp(attemptRes.data.server_time);
          const endTime = parseServerTimestamp(attemptRes.data.end_time);
          const clientTime = Date.now();

          if (!Number.isFinite(serverTime) || !Number.isFinite(endTime)) {
            console.error("Invalid attempt timestamps:", attemptRes.data);
            const fallbackEndTime = clientTime + (examData.duration * 60 * 1000);
            setEndTimeMs(fallbackEndTime);
            setServerOffsetMs(0);
            setTimeLeft(examData.duration * 60);
            setIsExamLocked(false);
            console.warn("⚠️ Using fallback timer - timestamps will be less secure");
            return;
          }

          setServerOffsetMs(serverTime - clientTime);
          setEndTimeMs(endTime);

          const remaining = Math.floor((endTime - serverTime) / 1000);
          setTimeLeft(Math.max(0, remaining));

          if (attemptRes.data.status === "submitted") {
            setIsSubmitted(true);
            setIsExamLocked(true);
            fetchExamResult();
          }
        }

      } catch (err) {
        console.error("Failed to load exam:", err);

        const status = err.response?.status;

        if (status === 400 && err.response?.data?.alreadySubmitted) {
          alert("This exam was already submitted (possibly auto-submitted due to disconnection).");
          setIsSubmitted(true);
          setIsExamLocked(true);
          setLoading(false);
          return;
        } else if (status === 403) {
          alert("You are not enrolled in this exam.");
          navigate("/student/exams");
        } else if (status === 404) {
          alert("Exam not found.");
          navigate("/student/exams");
        } else {
          alert("Unable to load exam.");
          navigate(-1);
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [examId, navigate]);

  const fetchExamResult = async () => {
    try {
      const token = await auth.currentUser.getIdToken(false);
      const res = await api.get(`/api/exams/results/${examId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult(res.data);
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error("Failed to fetch exam result:", err);
      }
    }
  };

  const checkExamStatus = async () => {
    if (!exam || isSubmitted) return;

    try {
      const token = await auth.currentUser.getIdToken(false);
      const res = await api.get(`/api/exams/${examId}/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.status === 'submitted') {
        console.log("📊 API Check: Exam was auto-submitted");
        setIsExamLocked(true);
        setIsSubmitted(true);
        fetchExamResult();
        alert("Exam was auto-submitted due to disconnection.");
      }
    } catch (err) {
      console.log("Could not check exam status:", err.message);
    }
  };

  /* =========================
     SOCKET CONNECTION
  ========================= */
  useEffect(() => {
    if (!exam || isSubmitted) return;

    const connectSocket = async () => {
      try {
        const token = await auth.currentUser.getIdToken(false);

        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
          auth: { token },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: Infinity,
          transports: ['websocket', 'polling']
        });

        socketRef.current = socket;

        socket.on("exam:autoSubmitted", (data) => {
          console.log("🚨 RECEIVED exam:autoSubmitted event:", data);
          setIsExamLocked(true);
          setIsSubmitted(true);
          fetchExamResult();
          alert(data.message || "Exam auto-submitted due to disconnection.");
        });

        socket.on("connect", () => {
          console.log("🔌 Connected to server, socket ID:", socket.id);
          socket.emit("exam:start", { examId });
          checkExamStatus();
        });

        socket.on("disconnect", (reason) => {
          console.warn("❌ Disconnected from server. Reason:", reason);
          if (reason === "io server disconnect") {
            socket.connect();
          }
        });

        socket.on("connect_error", (error) => {
          console.error("🚫 Connection error:", error.message);
        });

        socket.io.on("reconnect_attempt", (attempt) => {
          console.log("🔄 Reconnection attempt #", attempt);
        });

        socket.io.on("reconnect", (attempt) => {
          console.log("✅ Successfully reconnected after", attempt, "attempts");
        });

      } catch (error) {
        console.error("Socket connection error:", error);
      }
    };

    connectSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [exam, examId, isSubmitted]);

  /* =========================
     VISIBILITY CHECK (Status fallback)
  ========================= */
  useEffect(() => {
    if (!exam || isSubmitted) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkExamStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [exam, examId, isSubmitted]);

  /* =========================
     DRIFT-PROOF TIMER
  ========================= */
  useEffect(() => {
    if (!exam || isSubmitted || exam.duration === 0 || !endTimeMs || isExamLocked) return;

    const timer = setInterval(() => {
      const now = Date.now() + serverOffsetMs;
      const secondsRemaining = Math.floor((endTimeMs - now) / 1000);

      if (secondsRemaining <= 0) {
        setTimeLeft(0);
        setIsExamLocked(true);
        clearInterval(timer);
      } else {
        setTimeLeft(secondsRemaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [exam, endTimeMs, serverOffsetMs, isSubmitted, isExamLocked]);

  const formatTime = (seconds) => {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  /* =========================
     ANSWER HANDLING
  ========================= */
  const handleAnswer = async (question, value) => {
    if (isExamLocked || isSubmitted) return;

    setAnswers(prev => ({
      ...prev,
      [question.id]: value
    }));

    try {
      const token = await auth.currentUser.getIdToken(false);

      if (question.type === "mcq") {
        await api.post(
          `/api/exams/${examId}/save-answer`,
          { questionId: question.id, selectedOptionId: value },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await api.post(
          `/api/exams/${examId}/save-answer`,
          { questionId: question.id, answerText: value },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (error) {
      console.error("❌ Failed to save answer:", error.message);
    }
  };

  /* =========================
     SUBMIT EXAM
  ========================= */
  const handleSubmit = async () => {
    try {
      if (isSubmitted) return;

      const token = await auth.currentUser.getIdToken(false);

      const res = await api.post(
        `/api/exams/${examId}/submit`,
        { answers: answersRef.current },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setResult(res.data);
      setIsSubmitted(true);
      setCanRewrite(true);

    } catch (err) {
      console.error("❌ Exam submission failed:", err);

      const errorMessage = err.response?.data?.message || "Failed to submit exam. Please try again.";

      if (err.response?.status === 400 && err.response?.data?.message === "Exam already submitted") {
        setIsSubmitted(true);
        setCanRewrite(true);
        alert("Exam has been submitted. You can rewrite it if needed.");
      } else {
        alert(`Submission Error: ${errorMessage}`);
      }
    }
  };

  /* =========================
     REWRITE EXAM
  ========================= */
  const handleRewrite = async () => {
    try {
      const token = await auth.currentUser.getIdToken(false);

      await api.post(
        `/api/exams/${examId}/rewrite`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsSubmitted(false);
      setResult(null);
      setAnswers({});
      setCurrentQIndex(0);
      setCanRewrite(false);
      setSectionIndex(0);

      if (exam?.duration > 0) {
        const token2 = await auth.currentUser.getIdToken(false);
        const attemptRes = await api.get(
          `/api/exams/${examId}/attempt`,
          { headers: { Authorization: `Bearer ${token2}` } }
        );
        const serverTime = new Date(attemptRes.data.server_time).getTime();
        const endTime = new Date(attemptRes.data.end_time).getTime();
        setServerOffsetMs(serverTime - Date.now());
        setEndTimeMs(endTime);
        const remaining = Math.floor((endTime - serverTime) / 1000);
        setTimeLeft(Math.max(0, remaining));
      }

    } catch (err) {
      console.error("❌ Failed to create rewrite attempt:", err);
      alert("Failed to start rewrite. Please try again.");
    }
  };

  /* =========================
     EXAM SECURITY HOOK — FULLY DISABLED
  ========================= */
  const [securityModal, setSecurityModal] = useState({
    open: false,
    type: 'tab-switch',
    count: 0
  });

  // ✅ No-op handlers — violations completely disabled
  const handleSecurityWarning = () => {};
  const handleResumeExam = () => {
    setSecurityModal(prev => ({ ...prev, open: false }));
  };

  const { securityHandlers, triggerFullscreen, isTerminated } = useExamSecurity(
    handleSubmit,
    handleSecurityWarning,
    { enabled: false } // ✅ Always disabled
  );

  return (
    <ExamRunnerView
      loading={loading}
      exam={exam}
      currentQIndex={currentQIndex}
      setCurrentQIndex={setCurrentQIndex}
      answers={answers}
      handleAnswer={handleAnswer}
      timeLeft={timeLeft}
      isSubmitted={isSubmitted}
      result={result}
      handleSubmit={handleSubmit}
      handleRewrite={handleRewrite}
      canRewrite={canRewrite}
      formatTime={formatTime}
      navigate={navigate}
      securityHandlers={securityHandlers}
      triggerFullscreen={triggerFullscreen}
      securityModal={securityModal}
      handleResumeExam={handleResumeExam}
      isExamLocked={isExamLocked}
      isTerminated={isTerminated}
      // Section tab props
      activeSection={activeSection}
      sectionIndex={sectionIndex}
      setSectionIndex={setSectionIndex}
      sections={sections}
      availableSections={availableSections}
      handleSectionChange={handleSectionChange}
      sectionConfig={SECTION_CONFIG}
      // ✅ Proctoring — all disabled/inert
      isProctored={isProctored}
      stream={stream}
      proctoringError={proctoringError}
      startCamera={startCamera}
      isSuspicious={false}
      isVoiceSuspicious={false}
      multipleFacesDetected={false}
      detections={detections}
    />
  );
};

export default ExamRunner;