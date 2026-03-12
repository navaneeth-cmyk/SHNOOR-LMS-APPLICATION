import pool from "../db/postgres.js";
import csvParser from "csv-parser";
import { Readable } from "stream";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

// Create a new challenge
export const createChallenge = async (req, res) => {
  try {
    const {
      title,
      description,
      type = "code",
      difficulty,
      starter_code,
      test_cases,
    } = req.body;

    if (!title || !description || !difficulty) {
      return res
        .status(400)
        .json({ message: "Title, description, and difficulty are required" });
    }

    // 🔥 Ensure every test case has isPublic
    const normalizedTestCases = (test_cases || []).map((tc) => ({
      input: tc.input,
      output: tc.output,
      isPublic: tc.isPublic === true, // default false if not provided
    }));

    const result = await pool.query(
      `INSERT INTO practice_challenges 
            (title, description, type, difficulty, starter_code, test_cases) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *`,
      [
        title,
        description,
        type,
        difficulty,
        starter_code,
        JSON.stringify(normalizedTestCases),
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create Challenge Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete a challenge
export const deleteChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      "DELETE FROM practice_challenges WHERE challenge_id = $1",
      [id],
    );
    res.json({ message: "Challenge deleted successfully" });
  } catch (err) {
    console.error("Delete Challenge Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get all challenges
export const getChallenges = async (req, res) => {
  try {
    // Assume we have a practice_challenges table. If not, I will create it.
    const result = await pool.query(
      "SELECT * FROM practice_challenges ORDER BY RANDOM()",
    );
    res.json(result.rows);
  } catch (err) {
    // If table doesn't exist, return empty or mock for now to prevent crash until schema runs
    console.error("Get Challenges Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Get single challenge
export const getChallengeById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM practice_challenges WHERE challenge_id = $1",
      [id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Challenge not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get Challenge Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Verify Schema Helper (to run on startup)
export const verifyPracticeSchema = async () => {
  try {
    await pool.query(`
            CREATE TABLE IF NOT EXISTS practice_challenges (
                challenge_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'code', -- Added missing column
                difficulty VARCHAR(50) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
                starter_code TEXT,
                test_cases JSONB, -- Array of {input, output}
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

    // Check if empty, seed it
    const check = await pool.query("SELECT COUNT(*) FROM practice_challenges");
    if (parseInt(check.rows[0].count) === 0) {
      console.log("🌱 Seeding Practice Challenges...");
      await pool.query(`
    INSERT INTO practice_challenges (title, description, type, difficulty, starter_code, test_cases) VALUES 
    ('Two Sum', 'Given an array...', 'code', 'Easy', 'function twoSum(nums, target) {\n\n}', 
    '[{"input": "([2, 7, 11, 15], 9)", "output": "[0, 1]", "isPublic": true},
      {"input": "([3, 2, 4], 6)", "output": "[1, 2]", "isPublic": false}]'),

    ('Reverse String', 'Write a function...', 'code', 'Easy', 'function reverseString(s) {\n\n}', 
    '[{"input": "(\\"hello\\")", "output": "\\"olleh\\"", "isPublic": true}]')
`);
    }
    console.log("✅ Practice schema verified");
  } catch (err) {
    console.error("❌ Practice schema check failed", err);
  }
};

export const bulkUploadChallenges = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const results = [];
    const errors = [];
    let rowNumber = 0;

    // Parse CSV from buffer
    const stream = Readable.from(req.file.buffer.toString());

    stream
      .pipe(csvParser())
      .on("data", (row) => {
        rowNumber++;
        try {
          // Validate required fields
          if (!row.title || !row.description || !row.difficulty) {
            errors.push({
              row: rowNumber,
              data: row,
              error: "Missing required fields (title, description, or difficulty)",
            });
            return;
          }

          // Validate difficulty
          const validDifficulties = ["Easy", "Medium", "Hard"];
          if (!validDifficulties.includes(row.difficulty)) {
            errors.push({
              row: rowNumber,
              data: row,
              error: `Invalid difficulty. Must be one of: ${validDifficulties.join(", ")}`,
            });
            return;
          }

          // Parse test_cases JSON
          let testCases = [];
          if (row.test_cases) {
            try {
              testCases = JSON.parse(row.test_cases);

              // Validate test case structure
              if (!Array.isArray(testCases)) {
                throw new Error("test_cases must be an array");
              }

              // Ensure each test case has required fields
              testCases = testCases.map((tc) => ({
                input: tc.input || "",
                output: tc.output || "",
                isPublic: tc.isPublic === true || tc.isPublic === "true",
              }));
            } catch (e) {
              errors.push({
                row: rowNumber,
                data: row,
                error: `Invalid test_cases JSON: ${e.message}`,
              });
              return;
            }
          }

          // Add to results for bulk insert
          results.push({
            title: row.title.trim(),
            description: row.description.trim(),
            type: row.type || "code",
            difficulty: row.difficulty.trim(),
            starter_code: row.starter_code || "",
            test_cases: testCases,
          });
        } catch (err) {
          errors.push({
            row: rowNumber,
            data: row,
            error: err.message,
          });
        }
      })
      .on("end", async () => {
        try {
          // Bulk insert valid challenges
          const insertedChallenges = [];

          for (const challenge of results) {
            const result = await pool.query(
              `INSERT INTO practice_challenges 
               (title, description, type, difficulty, starter_code, test_cases) 
               VALUES ($1, $2, $3, $4, $5, $6) 
               RETURNING *`,
              [
                challenge.title,
                challenge.description,
                challenge.type,
                challenge.difficulty,
                challenge.starter_code,
                JSON.stringify(challenge.test_cases),
              ]
            );
            insertedChallenges.push(result.rows[0]);
          }

          res.status(200).json({
            message: "CSV upload completed",
            summary: {
              total: rowNumber,
              successful: insertedChallenges.length,
              failed: errors.length,
            },
            insertedChallenges,
            errors: errors.length > 0 ? errors : undefined,
          });
        } catch (dbError) {
          console.error("Database insertion error:", dbError);
          res.status(500).json({
            message: "Database error during bulk insert",
            error: dbError.message,
            partialResults: {
              parsed: results.length,
              errors: errors.length,
            },
          });
        }
      })
      .on("error", (err) => {
        console.error("CSV parsing error:", err);
        res.status(500).json({
          message: "Failed to parse CSV file",
          error: err.message,
        });
      });
  } catch (err) {
    console.error("Bulk upload error:", err);
    res.status(500).json({
      message: "Server error during upload",
      error: err.message,
    });
  }
};

// =====================================================
//  Helper: run a single process
// =====================================================
const runSingleTest = (cmd, args, input, options = {}) => {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, options);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    if (input !== undefined && input !== null) {
      child.stdin.write(input);
    }
    child.stdin.end();
    child.on("close", () => {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
};

// =====================================================
//  Student → Run practice code
// =====================================================
export const runPracticeCode = async (req, res) => {
  let workDir = null;

  try {
    let { code, language, challengeId } = req.body;

    if (!code || !language) {
      return res.status(400).json({ message: "code and language required" });
    }

    language = language.toLowerCase();

    // Fetch test cases from the practice_challenges table
    const challengeRes = await pool.query(
      "SELECT test_cases FROM practice_challenges WHERE challenge_id = $1",
      [challengeId]
    );

    if (!challengeRes.rowCount) {
      return res.status(404).json({ message: "Challenge not found" });
    }

    let testCases = challengeRes.rows[0].test_cases;

    // Parse if stored as string
    if (typeof testCases === "string") {
      testCases = JSON.parse(testCases);
    }

    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return res.status(404).json({ message: "No test cases found for this challenge" });
    }

    // Create temp working directory
    const baseTmp = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(baseTmp)) fs.mkdirSync(baseTmp);

    workDir = path.join(baseTmp, `practice_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(workDir);

    const results = [];
    let passedCount = 0;

    const checkOutput = async (runFn) => {
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const input = tc.input ?? "";
        const expected = String(tc.output ?? "").trim();
        const result = await runFn(input);

        const ok = result.stderr === "" && result.stdout === expected;
        if (ok) passedCount++;

        results.push({
          testCaseNumber: i + 1,
          passed: ok,
          isPublic: tc.isPublic !== false,
          input: tc.isPublic !== false ? tc.input : undefined,
          expectedOutput: tc.isPublic !== false ? expected : undefined,
          actualOutput: tc.isPublic !== false ? result.stdout : undefined,
          error: result.stderr || null,
        });
      }
    };

    /* ---------- PYTHON ---------- */
    if (language === "python") {
      fs.writeFileSync(path.join(workDir, "main.py"), code);
      await checkOutput((input) =>
        runSingleTest("python", ["main.py"], input, { cwd: workDir })
      );
    }

    /* ---------- JAVASCRIPT ---------- */
    else if (language === "javascript" || language === "js") {
      fs.writeFileSync(path.join(workDir, "main.js"), code);
      await checkOutput((input) =>
        runSingleTest("node", ["main.js"], input, { cwd: workDir })
      );
    }

    /* ---------- JAVA ---------- */
    else if (language === "java") {
      fs.writeFileSync(path.join(workDir, "Main.java"), code);
      const compile = await runSingleTest("javac", ["Main.java"], null, { cwd: workDir });
      if (compile.stderr) {
        return res.json({
          results: [{ testCaseNumber: 0, passed: false, error: compile.stderr }],
          passed: false,
        });
      }
      await checkOutput((input) =>
        runSingleTest("java", ["Main"], input, { cwd: workDir })
      );
    }

    /* ---------- C ---------- */
    else if (language === "c") {
      fs.writeFileSync(path.join(workDir, "main.c"), code);
      const compile = await runSingleTest("gcc", ["main.c", "-o", "main"], null, { cwd: workDir });
      if (compile.stderr) {
        return res.json({
          results: [{ testCaseNumber: 0, passed: false, error: compile.stderr }],
          passed: false,
        });
      }
      await checkOutput((input) =>
        runSingleTest(process.platform === "win32" ? "main.exe" : "./main", [], input, { cwd: workDir })
      );
    }

    /* ---------- C++ ---------- */
    else if (language === "cpp" || language === "c++") {
      fs.writeFileSync(path.join(workDir, "main.cpp"), code);
      const compile = await runSingleTest("g++", ["main.cpp", "-o", "main"], null, { cwd: workDir });
      if (compile.stderr) {
        return res.json({
          results: [{ testCaseNumber: 0, passed: false, error: compile.stderr }],
          passed: false,
        });
      }
      await checkOutput((input) =>
        runSingleTest(process.platform === "win32" ? "main.exe" : "./main", [], input, { cwd: workDir })
      );
    }

    /* ---------- GO ---------- */
    else if (language === "go") {
      fs.writeFileSync(path.join(workDir, "main.go"), code);
      await checkOutput((input) =>
        runSingleTest("go", ["run", "main.go"], input, { cwd: workDir })
      );
    }

    else {
      return res.status(400).json({ message: "Unsupported language" });
    }

    res.json({
      results,
      summary: {
        total: results.length,
        passed: passedCount,
        failed: results.length - passedCount,
      },
      passed: passedCount === results.length,
    });

  } catch (err) {
    console.error("runPracticeCode error:", err);
    res.status(500).json({ message: "Failed to run code", error: err.message });

  } finally {
    try {
      if (workDir && fs.existsSync(workDir)) {
        fs.rmSync(workDir, { recursive: true, force: true });
      }
    } catch (_) { /* ignore cleanup errors */ }
  }
};

// =====================================================
//  Student → Get completed challenges
// =====================================================
export const getCompletedChallenges = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      // Return empty list instead of 401 to avoid triggering global interceptor logout
      return res.json({ completedChallengeIds: [] });
    }

    // Ensure table exists (it's created on first submission, may not exist yet)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS practice_submissions (
        submission_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES users(user_id),
        challenge_id UUID REFERENCES practice_challenges(challenge_id),
        code TEXT NOT NULL,
        language VARCHAR(50) NOT NULL,
        passed_count INTEGER DEFAULT 0,
        total_count INTEGER DEFAULT 0,
        score VARCHAR(20),
        all_passed BOOLEAN DEFAULT FALSE,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const result = await pool.query(
      `SELECT DISTINCT challenge_id FROM practice_submissions
       WHERE user_id = $1 AND all_passed = TRUE`,
      [userId]
    );

    const completedIds = result.rows.map(r => r.challenge_id);
    res.json({ completedChallengeIds: completedIds });
  } catch (err) {
    console.error("getCompletedChallenges error:", err);
    // Return empty list on error instead of 500 to prevent UI breaking
    res.json({ completedChallengeIds: [] });
  }
};

// =====================================================
//  Student → Submit practice code (run + save)
// =====================================================
export const submitPracticeCode = async (req, res) => {
  let workDir = null;

  try {
    let { code, language, challengeId } = req.body;
    const userId = req.user?.id;

    if (!code || !language) {
      return res.status(400).json({ message: "code and language required" });
    }

    if (!challengeId) {
      return res.status(400).json({ message: "challengeId is required" });
    }

    language = language.toLowerCase();

    // Fetch test cases from the practice_challenges table
    const challengeRes = await pool.query(
      "SELECT test_cases FROM practice_challenges WHERE challenge_id = $1",
      [challengeId]
    );

    if (!challengeRes.rowCount) {
      return res.status(404).json({ message: "Challenge not found" });
    }

    let testCases = challengeRes.rows[0].test_cases;

    // Parse if stored as string
    if (typeof testCases === "string") {
      testCases = JSON.parse(testCases);
    }

    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return res.status(404).json({ message: "No test cases found for this challenge" });
    }

    // Create temp working directory
    const baseTmp = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(baseTmp)) fs.mkdirSync(baseTmp);

    workDir = path.join(baseTmp, `submit_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(workDir);

    const results = [];
    let passedCount = 0;

    const checkOutput = async (runFn) => {
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const input = tc.input ?? "";
        const expected = String(tc.output ?? "").trim();
        const result = await runFn(input);

        const ok = result.stderr === "" && result.stdout === expected;
        if (ok) passedCount++;

        results.push({
          testCaseNumber: i + 1,
          passed: ok,
          isPublic: tc.isPublic !== false,
          input: tc.isPublic !== false ? tc.input : undefined,
          expectedOutput: tc.isPublic !== false ? expected : undefined,
          actualOutput: tc.isPublic !== false ? result.stdout : undefined,
          error: result.stderr || null,
        });
      }
    };

    /* ---------- PYTHON ---------- */
    if (language === "python") {
      fs.writeFileSync(path.join(workDir, "main.py"), code);
      await checkOutput((input) =>
        runSingleTest("python", ["main.py"], input, { cwd: workDir })
      );
    }

    /* ---------- JAVASCRIPT ---------- */
    else if (language === "javascript" || language === "js") {
      fs.writeFileSync(path.join(workDir, "main.js"), code);
      await checkOutput((input) =>
        runSingleTest("node", ["main.js"], input, { cwd: workDir })
      );
    }

    /* ---------- JAVA ---------- */
    else if (language === "java") {
      fs.writeFileSync(path.join(workDir, "Main.java"), code);
      const compile = await runSingleTest("javac", ["Main.java"], null, { cwd: workDir });
      if (compile.stderr) {
        return res.json({
          results: [{ testCaseNumber: 0, passed: false, error: compile.stderr }],
          summary: { total: testCases.length, passed: 0, failed: testCases.length },
          passed: false,
        });
      }
      await checkOutput((input) =>
        runSingleTest("java", ["Main"], input, { cwd: workDir })
      );
    }

    /* ---------- C ---------- */
    else if (language === "c") {
      fs.writeFileSync(path.join(workDir, "main.c"), code);
      const compile = await runSingleTest("gcc", ["main.c", "-o", "main"], null, { cwd: workDir });
      if (compile.stderr) {
        return res.json({
          results: [{ testCaseNumber: 0, passed: false, error: compile.stderr }],
          summary: { total: testCases.length, passed: 0, failed: testCases.length },
          passed: false,
        });
      }
      await checkOutput((input) =>
        runSingleTest(process.platform === "win32" ? "main.exe" : "./main", [], input, { cwd: workDir })
      );
    }

    /* ---------- C++ ---------- */
    else if (language === "cpp" || language === "c++") {
      fs.writeFileSync(path.join(workDir, "main.cpp"), code);
      const compile = await runSingleTest("g++", ["main.cpp", "-o", "main"], null, { cwd: workDir });
      if (compile.stderr) {
        return res.json({
          results: [{ testCaseNumber: 0, passed: false, error: compile.stderr }],
          summary: { total: testCases.length, passed: 0, failed: testCases.length },
          passed: false,
        });
      }
      await checkOutput((input) =>
        runSingleTest(process.platform === "win32" ? "main.exe" : "./main", [], input, { cwd: workDir })
      );
    }

    /* ---------- GO ---------- */
    else if (language === "go") {
      fs.writeFileSync(path.join(workDir, "main.go"), code);
      await checkOutput((input) =>
        runSingleTest("go", ["run", "main.go"], input, { cwd: workDir })
      );
    }

    else {
      return res.status(400).json({ message: "Unsupported language" });
    }

    const allPassed = passedCount === results.length;
    const score = `${passedCount}/${results.length}`;

    // ✅ Save submission to database
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS practice_submissions (
          submission_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES users(user_id),
          challenge_id UUID REFERENCES practice_challenges(challenge_id),
          code TEXT NOT NULL,
          language VARCHAR(50) NOT NULL,
          passed_count INTEGER DEFAULT 0,
          total_count INTEGER DEFAULT 0,
          score VARCHAR(20),
          all_passed BOOLEAN DEFAULT FALSE,
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(
        `INSERT INTO practice_submissions 
          (user_id, challenge_id, code, language, passed_count, total_count, score, all_passed) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, challengeId, code, language, passedCount, results.length, score, allPassed]
      );
    } catch (dbErr) {
      console.error("Failed to save submission:", dbErr);
      // Don't fail the entire request if DB save fails — still return results
    }

    res.json({
      results,
      summary: {
        total: results.length,
        passed: passedCount,
        failed: results.length - passedCount,
      },
      passed: allPassed,
      score,
      message: allPassed
        ? "All test cases passed! Solution submitted."
        : `${passedCount}/${results.length} test cases passed. Solution submitted.`,
    });

  } catch (err) {
    console.error("submitPracticeCode error:", err);
    res.status(500).json({ message: "Failed to submit code", error: err.message });

  } finally {
    try {
      if (workDir && fs.existsSync(workDir)) {
        fs.rmSync(workDir, { recursive: true, force: true });
      }
    } catch (_) { /* ignore cleanup errors */ }
  }
};