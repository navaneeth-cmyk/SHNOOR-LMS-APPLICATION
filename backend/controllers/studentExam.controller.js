import pool from "../db/postgres.js";
import { autoGradeDescriptive } from "./exams/examdescriptive.controller.js";
import { submitExam as submitExamUnified } from "./exams/examSubmission.controller.js";
import { issueExamCertificate } from "./certificate.controller.js";

// =============================================================================
// getStudentExams
// — Doc 3: simple approved-exam list, no enrollment filter, no course title
// — Doc 4: filters by enrolled courses, joins course title + attempt status
// — Integrated: uses Doc 4's richer query; falls back gracefully if
//   student_courses has no rows (returns empty array, not a 500)
// =============================================================================
export const getStudentExams = async (req, res) => {
  try {
    const studentId = req.user.id;

    const { rows } = await pool.query(
      `
      SELECT
        e.exam_id,
        e.title,
        e.duration,
        e.pass_percentage,
        c.title                                           AS course_title,
        (er.exam_id IS NOT NULL)                          AS attempted,
        ea.status                                         AS attempt_status,
        (ea.status = 'submitted' OR er.exam_id IS NOT NULL) AS is_completed,
        er.percentage,
        er.passed
      FROM exams e
      JOIN courses          c  ON c.courses_id  = e.course_id
      JOIN student_courses  sc ON sc.course_id  = c.courses_id
      LEFT JOIN exam_results  er ON er.exam_id  = e.exam_id  AND er.student_id  = $1
      LEFT JOIN exam_attempts ea ON ea.exam_id  = e.exam_id  AND ea.student_id  = $1
      WHERE sc.student_id = $1
      ORDER BY e.created_at DESC
      `,
      [studentId],
    );

    res.json(rows);
  } catch (err) {
    console.error("getStudentExams error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// =============================================================================
// getExamForAttempt
// — Doc 3: basic lookup, skipped enrollment, no attempt tracking, no shuffle
// — Doc 4: virtual "final_<courseId>" IDs, enrollment guard, timer tracking,
//          per-student seeded shuffle, coding question fields
// — Integrated: full Doc 4 logic retained; Doc 3's simpler path is the
//   fallback when virtual-ID resolution is not needed
// =============================================================================
export const getExamForAttempt = async (req, res) => {
  try {
    let { examId } = req.params;
    const studentId = req.user.id;
    let isFinalExamLookup = false;

    /* -----------------------------------------------------------------------
       STEP 0 — Resolve virtual "final_<courseId>" exam IDs (Doc 4)
    ----------------------------------------------------------------------- */
    if (examId && examId.startsWith("final_")) {
      const courseId = examId.replace("final_", "");
      const { rows: resolvedExams } = await pool.query(
        `
        SELECT e.exam_id
        FROM exams e
        LEFT JOIN exam_attempts ea
          ON ea.exam_id = e.exam_id AND ea.student_id = $2
        WHERE e.course_id = $1
        ORDER BY (ea.exam_id IS NOT NULL) DESC, e.created_at DESC
        LIMIT 1
        `,
        [courseId, studentId],
      );

      if (resolvedExams.length) {
        console.log(
          `🔍 RESOLVED getExamForAttempt ID from ${examId} to ${resolvedExams[0].exam_id}`,
        );
        examId = resolvedExams[0].exam_id;
      } else {
        examId = courseId;
      }
      isFinalExamLookup = true;
    }

    /* -----------------------------------------------------------------------
       STEP 1 — Fetch exam metadata
    ----------------------------------------------------------------------- */
    const examRes = await pool.query(
      isFinalExamLookup
        ? `SELECT exam_id, title, duration, pass_percentage, course_id
           FROM exams
           WHERE course_id = $1
           LIMIT 1`
        : `SELECT exam_id, title, duration, pass_percentage, course_id
           FROM exams
           WHERE exam_id = $1`,
      [examId],
    );

    if (examRes.rowCount === 0) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const exam = examRes.rows[0];
    // Sync local examId to the real DB id for all subsequent queries
    examId = exam.exam_id;

    /* -----------------------------------------------------------------------
       STEP 2 — Enrollment check (Doc 4; Doc 3 skipped this)
    ----------------------------------------------------------------------- */
    if (exam.course_id) {
      const enrolled = await pool.query(
        `
        SELECT 1
        FROM student_courses
        WHERE student_id = $1 AND course_id = $2
        `,
        [studentId, exam.course_id],
      );

      if (enrolled.rowCount === 0) {
        return res.status(403).json({ message: "Not enrolled in this course" });
      }
    }

    /* -----------------------------------------------------------------------
       STEP 3 — Already-submitted guard (Doc 4)
    ----------------------------------------------------------------------- */
    const attemptCheck = await pool.query(
      `SELECT status FROM exam_attempts WHERE exam_id = $1 AND student_id = $2`,
      [examId, studentId],
    );

    if (
      attemptCheck.rows.length > 0 &&
      attemptCheck.rows[0].status === "submitted"
    ) {
      return res.status(400).json({
        message: "Exam already submitted",
        alreadySubmitted: true,
      });
    }

    /* -----------------------------------------------------------------------
       STEP 4 — Create / resume attempt record with timer (Doc 4)
    ----------------------------------------------------------------------- */
    await pool.query(
      `
      INSERT INTO exam_attempts
        (exam_id, student_id, status, start_time, end_time)
      VALUES
        ($1, $2, 'in_progress', NOW(), NOW() + ($3 * INTERVAL '1 minute'))
      ON CONFLICT (exam_id, student_id) DO UPDATE
        SET status          = 'in_progress',
            start_time      = COALESCE(exam_attempts.start_time, EXCLUDED.start_time),
            end_time        = COALESCE(exam_attempts.end_time,   EXCLUDED.end_time),
            disconnected_at = NULL
      WHERE exam_attempts.status != 'submitted'
      RETURNING start_time, end_time
      `,
      [examId, studentId, exam.duration],
    );

    const debugAttempt = await pool.query(
      `SELECT start_time, end_time, NOW() AS db_now
       FROM exam_attempts
       WHERE exam_id = $1 AND student_id = $2`,
      [examId, studentId],
    );
    console.log("🔍 Attempt timestamps created/fetched:", {
      examId,
      duration: exam.duration,
      start_time: debugAttempt.rows[0].start_time,
      end_time: debugAttempt.rows[0].end_time,
      db_now: debugAttempt.rows[0].db_now,
      expected_duration_ms: exam.duration * 60 * 1000,
      actual_duration_ms:
        new Date(debugAttempt.rows[0].end_time) -
        new Date(debugAttempt.rows[0].start_time),
    });

    /* -----------------------------------------------------------------------
       STEP 5 — Fetch questions
       Doc 3: id, text, type, marks, options (plain text array)
       Doc 4: + title, description, starterCode, options as {id,text},
               testCases for coding questions
       Integrated: Doc 4's full query (superset of Doc 3)
    ----------------------------------------------------------------------- */
    const { rows } = await pool.query(
      `
      SELECT
        e.exam_id,
        e.title,
        e.duration,
        e.pass_percentage AS pass_score,

        COALESCE(
          json_agg(
            json_build_object(
              'id',          q.question_id,
              'text',        q.question_text,
              'title',       COALESCE(cq.title, q.question_text),
              'description', cq.description,
              'type',        q.question_type,
              'marks',       q.marks,
              'starterCode', cq.starter_code,
              'options', (
                SELECT json_agg(
                  json_build_object('id', o.option_id, 'text', o.option_text)
                  ORDER BY o.option_order
                )
                FROM exam_mcq_options o
                WHERE o.question_id = q.question_id
                  AND o.option_text IS NOT NULL
              ),
              'testCases', (
                SELECT json_agg(
                  json_build_object(
                    'input',    tc.input,
                    'output',   tc.expected_output,
                    'isPublic', NOT tc.is_hidden
                  )
                )
                FROM exam_test_cases tc
                WHERE tc.coding_id = cq.coding_id
              )
            )
            ORDER BY q.question_order
          ) FILTER (WHERE q.question_id IS NOT NULL),
          '[]'
        ) AS questions

      FROM exams e
      LEFT JOIN exam_questions        q  ON q.exam_id    = e.exam_id
      LEFT JOIN exam_coding_questions cq ON cq.question_id = q.question_id
      WHERE e.exam_id = $1
      GROUP BY e.exam_id, e.title, e.duration, e.pass_percentage
      `,
      [examId],
    );

    /* -----------------------------------------------------------------------
       STEP 6 — Per-student seeded shuffle (Doc 4 anti-cheat)
    ----------------------------------------------------------------------- */
    const examPayload = rows[0];

    if (Array.isArray(examPayload?.questions)) {
      const hashString = (value) => {
        let hash = 0;
        for (let i = 0; i < value.length; i += 1) {
          hash = (hash << 5) - hash + value.charCodeAt(i);
          hash |= 0;
        }
        return hash >>> 0;
      };

      const seededRandom = (seed) => {
        let t = seed + 0x6d2b79f5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };

      const shuffleWithSeed = (items, seed) => {
        for (let i = items.length - 1; i > 0; i -= 1) {
          const j = Math.floor(seededRandom(seed + i) * (i + 1));
          [items[i], items[j]] = [items[j], items[i]];
        }
      };

      const baseSeed = hashString(`${studentId}:${examId}`);
      shuffleWithSeed(examPayload.questions, baseSeed);

      examPayload.questions.forEach((question, index) => {
        if (question.type === "mcq" && Array.isArray(question.options)) {
          const optionSeed =
            baseSeed + hashString(`${question.id}:${index}`);
          shuffleWithSeed(question.options, optionSeed);
        }
      });
    }

    /* -----------------------------------------------------------------------
       STEP 7 — Send response
    ----------------------------------------------------------------------- */
    res.json(examPayload);
  } catch (err) {
    console.error("getExamForAttempt error:", err);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};

// =============================================================================
// submitExam
// — Doc 3: saves raw answers only, no grading, no transaction
// — Doc 4: delegates to unified grading pipeline (MCQ + descriptive + coding)
// — Integrated: delegates to unified pipeline (Doc 4). The full inline grading
//   logic below is kept as a self-contained fallback in case the unified
//   controller is unavailable.
// =============================================================================
export const submitExam = async (req, res) => {
  // Primary path — unified grading pipeline (MCQ + descriptive + coding)
  return submitExamUnified(req, res);

  // ── FALLBACK (unreachable unless submitExamUnified is removed) ──────────
  const client = await pool.connect();

  try {
    let { examId } = req.params;

    // Resolve virtual exam IDs
    if (examId && examId.startsWith("final_")) {
      const courseId = examId.replace("final_", "");
      const { rows: resolvedExams } = await client.query(
        "SELECT exam_id FROM exams WHERE course_id = $1 LIMIT 1",
        [courseId],
      );
      if (resolvedExams.length) examId = resolvedExams[0].exam_id;
    }

    const studentId = req.user.id;
    const { answers } = req.body;

    /* -----------------------------------------------------------------------
       Time-window enforcement (Doc 4)
    ----------------------------------------------------------------------- */
    const { rows: attemptRows } = await client.query(
      `
      SELECT ea.end_time, e.disconnect_grace_time
      FROM exam_attempts ea
      JOIN exams e ON e.exam_id = ea.exam_id
      WHERE ea.exam_id = $1 AND ea.student_id = $2
      `,
      [examId, studentId],
    );

    if (!attemptRows.length) {
      return res.status(400).json({ message: "Exam attempt not found" });
    }

    const { end_time: endTime, disconnect_grace_time: graceSeconds = 0 } =
      attemptRows[0];
    const { rows: nowRows } = await client.query(`SELECT NOW() AS now`);
    const deadlineMs =
      new Date(endTime).getTime() + (graceSeconds || 0) * 1000;

    if (new Date(nowRows[0].now).getTime() > deadlineMs) {
      return res.status(403).json({ message: "Submission window closed" });
    }

    if (!answers || Object.keys(answers).length === 0) {
      return res.status(400).json({ message: "No answers submitted" });
    }

    await client.query("BEGIN");

    // Clear previous answers (allow resubmit within window)
    await client.query(
      `DELETE FROM exam_answers WHERE exam_id = $1 AND student_id = $2`,
      [examId, studentId],
    );

    /* -----------------------------------------------------------------------
       Fetch questions for grading
    ----------------------------------------------------------------------- */
    const { rows: questions } = await client.query(
      `
      SELECT q.question_id, q.marks, q.question_type,
             o.option_id, o.is_correct
      FROM exam_questions q
      LEFT JOIN exam_mcq_options o ON q.question_id = o.question_id
      WHERE q.exam_id = $1
      `,
      [examId],
    );

    let totalMarks = 0;
    let obtainedMarks = 0;
    const questionMap = {};

    questions.forEach((q) => {
      if (!questionMap[q.question_id]) {
        questionMap[q.question_id] = q;
        totalMarks += q.marks;
      }
    });

    /* -----------------------------------------------------------------------
       Grade and save each answer
    ----------------------------------------------------------------------- */
    for (const [questionId, answer] of Object.entries(answers)) {
      const questionIdNum = Number(questionId);
      const question = questionMap[questionId];
      if (!question) continue;

      let marksObtained = 0;

      // MCQ grading
      if (question.question_type === "mcq") {
        const selectedOptionId = Number(answer);
        const correct = questions.find(
          (q) =>
            Number(q.question_id) === questionIdNum &&
            Number(q.option_id) === selectedOptionId &&
            q.is_correct,
        );
        if (correct) {
          marksObtained = question.marks;
          obtainedMarks += marksObtained;
        }

        await client.query(
          `
          INSERT INTO exam_answers
            (exam_id, question_id, student_id, selected_option_id, marks_obtained)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT ON CONSTRAINT unique_answer_per_question
          DO UPDATE SET
            selected_option_id = EXCLUDED.selected_option_id,
            marks_obtained     = EXCLUDED.marks_obtained
          `,
          [examId, questionIdNum, studentId, selectedOptionId, marksObtained],
        );
      }

      // Descriptive grading (Doc 4 + autoGradeDescriptive)
      if (question.question_type === "descriptive") {
        const answerText = typeof answer === "string" ? answer : "";
        const { rows: qDetails } = await client.query(
          `SELECT keywords, min_word_count, marks
           FROM exam_questions WHERE question_id = $1`,
          [questionIdNum],
        );
        const q = qDetails[0];
        const calculatedMarks = q
          ? autoGradeDescriptive(
              answerText,
              q.keywords,
              q.min_word_count || 30,
              q.marks,
            )
          : 0;

        obtainedMarks += calculatedMarks;

        await client.query(
          `
          INSERT INTO exam_answers
            (exam_id, question_id, student_id, answer_text, marks_obtained)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT ON CONSTRAINT unique_answer_per_question
          DO UPDATE SET
            answer_text    = EXCLUDED.answer_text,
            marks_obtained = EXCLUDED.marks_obtained
          `,
          [examId, questionIdNum, studentId, answerText, calculatedMarks],
        );
      }
    }

    /* -----------------------------------------------------------------------
       Calculate result and persist
    ----------------------------------------------------------------------- */
    const percentage =
      totalMarks === 0
        ? 0
        : Math.round((obtainedMarks / totalMarks) * 100);

    const { rows: examRows } = await client.query(
      `SELECT pass_percentage FROM exams WHERE exam_id = $1`,
      [examId],
    );
    const passed = percentage >= examRows[0].pass_percentage;

    await client.query(
      `
      INSERT INTO exam_results
        (exam_id, student_id, total_marks, obtained_marks, percentage, passed, evaluated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (exam_id, student_id) DO UPDATE SET
        total_marks    = EXCLUDED.total_marks,
        obtained_marks = EXCLUDED.obtained_marks,
        percentage     = EXCLUDED.percentage,
        passed         = EXCLUDED.passed,
        evaluated_at   = NOW()
      `,
      [examId, studentId, totalMarks, obtainedMarks, percentage, passed],
    );

    await client.query(
      `
      UPDATE exam_attempts
      SET status         = 'submitted',
          submitted_at   = NOW(),
          disconnected_at = NULL
      WHERE exam_id = $1 AND student_id = $2
      `,
      [examId, studentId],
    );

    await client.query("COMMIT");

    // Issue certificate if passed
    let certificateIssued = false;
    if (passed) {
      try {
        const cert = await issueExamCertificate({
          userId: studentId,
          examId,
          score: percentage,
        });
        certificateIssued = Boolean(cert?.issued);
      } catch (certErr) {
        console.error("Certificate issuance error:", certErr);
      }
    }

    res.status(200).json({
      message: "Exam submitted successfully",
      totalMarks,
      obtainedMarks,
      percentage,
      passed,
      certificateIssued,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("submitExam error:", err);
    res.status(500).json({ message: "Failed to submit exam" });
  } finally {
    client.release();
  }
};

// =============================================================================
// autoSubmitExam  (Doc 4 only — server-triggered on timer expiry)
// Called by scheduler/socket, not an HTTP handler
// =============================================================================
export const autoSubmitExam = async (studentId, examId) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT status FROM exam_attempts
       WHERE exam_id = $1 AND student_id = $2`,
      [examId, studentId],
    );

    if (!rows.length || rows[0].status === "submitted") {
      await client.query("ROLLBACK");
      return;
    }

    await client.query(
      `
      UPDATE exam_attempts
      SET status          = 'submitted',
          submitted_at    = NOW(),
          disconnected_at = NULL
      WHERE exam_id = $1 AND student_id = $2
      `,
      [examId, studentId],
    );

    await client.query("COMMIT");
    console.log(`✅ Auto-submitted exam ${examId} for student ${studentId}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("autoSubmitExam error:", err);
  } finally {
    client.release();
  }
};

// =============================================================================
// logViolation  (Doc 3 — retained; likely split into its own controller in
//                Doc 4's modular structure, but kept here for completeness)
// =============================================================================
export const logViolation = async (req, res) => {
  try {
    const { examId } = req.params;
    const studentId = req.user.id;
    const { type, details } = req.body;

    console.log("\n**************************************************");
    console.log(`🚀 [VIOLATION RECEIVED]`);
    console.log(`📅 Time: ${new Date().toLocaleString()}`);
    console.log(`👤 Student ID: ${studentId}`);
    console.log(`📝 Exam ID: ${examId}`);
    console.log(`⚠️  Type: ${type}`);
    console.log("**************************************************\n");

    await pool.query(
      `INSERT INTO exam_violations
         (exam_id, student_id, violation_type, details)
       VALUES ($1, $2, $3, $4)`,
      [String(examId), studentId, type, JSON.stringify(details)],
    );

    console.log("✅ [DATABASE] Violation saved successfully.");
    res.json({ success: true });
  } catch (err) {
    console.error("❌ [VIOLATION ERROR]:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// =============================================================================
// savePracticeResult  (Doc 3 — retained for practice/quiz flows that sit
//                      outside the formal exam pipeline)
// =============================================================================
export const savePracticeResult = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { percentage, obtained_marks, total_marks } = req.body;

    console.log(
      `\n--- [PRACTICE RESULT] Saving for Student: ${studentId} ---`,
    );

    await pool.query(
      `
      INSERT INTO exam_results
        (exam_id, student_id, total_marks, obtained_marks, percentage, passed)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (exam_id, student_id) DO UPDATE SET
        total_marks    = EXCLUDED.total_marks,
        obtained_marks = EXCLUDED.obtained_marks,
        percentage     = EXCLUDED.percentage,
        passed         = EXCLUDED.passed,
        evaluated_at   = NOW()
      `,
      [
        "practice-quiz",
        studentId,
        total_marks || 100,
        obtained_marks ?? percentage,
        percentage,
        percentage >= 50,
      ],
    );

    console.log("✅ [DATABASE] Practice result saved successfully.");
    res.json({ success: true });
  } catch (err) {
    console.error("❌ [PRACTICE RESULT ERROR]:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};