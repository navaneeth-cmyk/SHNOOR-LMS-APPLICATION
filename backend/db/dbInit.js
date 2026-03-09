import pool from './postgres.js';

/**
 * Centrally initializes all required database tables if they don't exist.
 * This ensures the application remains stable even if a developer forgets 
 * to run manual migrations.
 */
export const initializeDatabase = async () => {
    try {
        console.log("🛠️  Initializing Database Tables...");

        // 1. Ensure PGCrypto for UUID generation
        await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

        // 2. Learning Paths Module
        console.log("   - Setting up Learning Paths...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS learning_paths (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                instructor_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS learning_path_courses (
                id SERIAL PRIMARY KEY,
                learning_path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
                course_id UUID REFERENCES courses(courses_id) ON DELETE CASCADE,
                order_index INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(learning_path_id, course_id)
            );
        `);

        // 3. Exams Module
        console.log("   - Setting up Exams...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS exams (
                exam_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                duration INT NOT NULL, -- in minutes
                pass_percentage INT DEFAULT 40,
                instructor_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
                course_id UUID REFERENCES courses(courses_id) ON DELETE CASCADE,
                validity_value INT,
                validity_unit VARCHAR(20), -- 'days', 'months', 'years'
                disconnect_grace_time INT DEFAULT 300, -- 5 mins grace for power cuts/net loss
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS exam_questions (
                question_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                exam_id UUID REFERENCES exams(exam_id) ON DELETE CASCADE,
                question_text TEXT NOT NULL,
                question_type VARCHAR(50) DEFAULT 'mcq', -- mcq, descriptive, coding
                marks INT DEFAULT 1,
                keywords TEXT, -- for descriptive auto-grading
                min_word_count INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS exam_mcq_options (
                option_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                question_id UUID REFERENCES exam_questions(question_id) ON DELETE CASCADE,
                option_text TEXT NOT NULL,
                is_correct BOOLEAN DEFAULT FALSE,
                option_order INT DEFAULT 0
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS exam_attempts (
                exam_id UUID REFERENCES exams(exam_id) ON DELETE CASCADE,
                student_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'in_progress', -- in_progress, submitted, graded
                start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                end_time TIMESTAMP,
                submitted_at TIMESTAMP,
                disconnected_at TIMESTAMP,
                PRIMARY KEY (exam_id, student_id)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS exam_answers (
                answer_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                exam_id UUID REFERENCES exams(exam_id) ON DELETE CASCADE,
                question_id UUID REFERENCES exam_questions(question_id) ON DELETE CASCADE,
                student_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
                selected_option_id UUID REFERENCES exam_mcq_options(option_id),
                answer_text TEXT,
                marks_obtained INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_answer_per_question UNIQUE (exam_id, question_id, student_id)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS exam_results (
                exam_id UUID REFERENCES exams(exam_id) ON DELETE CASCADE,
                student_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
                total_marks INT NOT NULL,
                obtained_marks INT NOT NULL,
                percentage FLOAT NOT NULL,
                passed BOOLEAN DEFAULT FALSE,
                evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (exam_id, student_id)
            );
        `);

        // 4. Practice Challenges
        console.log("   - Setting up Practice Challenges...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS practice_challenges (
                challenge_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'code',
                difficulty VARCHAR(50) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
                starter_code TEXT,
                test_cases JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 5. Course Comments Voting
        console.log("   - Setting up Comment Votes...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS comment_votes (
                vote_id SERIAL PRIMARY KEY,
                comment_id UUID REFERENCES course_comments(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
                vote_type VARCHAR(10) CHECK (vote_type IN ('upvote', 'downvote')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(comment_id, user_id)
            );
        `);

        console.log("✅ Database tables verified and initialized successfully!");
    } catch (err) {
        console.error("❌ Database Initialization Error:", err);
        // We don't exit process here to allow the app to try starting anyway,
        // but critical features might fail.
    }
};