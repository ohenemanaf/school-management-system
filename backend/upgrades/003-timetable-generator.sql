-- Upgrade for databases created before the timetable generator (streams, terms,
-- teacher subjects, allocations, generator runs, reminders).
-- New installations already include everything below; do not run it on them.
-- Run once, after a backup:  mysql -u <user> -p <database> < backend/upgrades/003-timetable-generator.sql
-- Additive only: new tables and new columns with defaults; no data is changed.

CREATE TABLE IF NOT EXISTS streams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    sort_order INT NOT NULL DEFAULT 0
);

ALTER TABLE student_groups
    ADD COLUMN stream_id INT NULL AFTER program_id,
    ADD FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE SET NULL;

ALTER TABLE courses
    ADD COLUMN is_heavy BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE lecturers
    ADD COLUMN max_periods_per_week INT NOT NULL DEFAULT 25,
    ADD COLUMN max_periods_per_day INT NOT NULL DEFAULT 6;

-- TIMETABLE GENERATOR AND REMINDERS

-- Academic terms; one is marked current
CREATE TABLE IF NOT EXISTS terms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exam weeks within a term; alert_days lists how many days before start to warn people
CREATE TABLE IF NOT EXISTS exam_periods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    term_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    alert_days VARCHAR(50) NOT NULL DEFAULT '14,7,1',
    audience ENUM('ALL', 'STUDENT', 'LECTURER') NOT NULL DEFAULT 'ALL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE,
    INDEX idx_exam_periods_start (start_date)
);

-- What each lecturer can teach (1 = can teach, 2 = good, 3 = specialist)
CREATE TABLE IF NOT EXISTS lecturer_subjects (
    lecturer_id INT NOT NULL,
    course_id INT NOT NULL,
    proficiency TINYINT NOT NULL DEFAULT 2,
    PRIMARY KEY (lecturer_id, course_id),
    FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- The school day: numbered lesson periods and breaks, Monday to Friday
CREATE TABLE IF NOT EXISTS bell_periods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    period_no INT NOT NULL UNIQUE,
    label VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    kind ENUM('LESSON', 'BREAK') NOT NULL DEFAULT 'LESSON'
);

-- Per term: which subjects each class takes, how many periods a week, and an optional fixed teacher
CREATE TABLE IF NOT EXISTS class_subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    term_id INT NOT NULL,
    student_group_id INT NOT NULL,
    course_id INT NOT NULL,
    periods_per_week INT NOT NULL,
    lecturer_id INT NULL,
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE,
    FOREIGN KEY (student_group_id) REFERENCES student_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE SET NULL,
    UNIQUE KEY unique_term_class_subject (term_id, student_group_id, course_id)
);

-- Each generator run is a draft until published to timetable_sessions
CREATE TABLE IF NOT EXISTS timetable_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    term_id INT NOT NULL,
    status ENUM('DRAFT', 'PUBLISHED', 'SUPERSEDED') NOT NULL DEFAULT 'DRAFT',
    seed INT NOT NULL,
    penalty INT NOT NULL DEFAULT 0,
    placed INT NOT NULL DEFAULT 0,
    required INT NOT NULL DEFAULT 0,
    report LONGTEXT,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS timetable_run_lessons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    run_id INT NOT NULL,
    student_group_id INT NOT NULL,
    course_id INT NOT NULL,
    lecturer_id INT NOT NULL,
    room_id INT NOT NULL,
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday') NOT NULL,
    period_no INT NOT NULL,
    FOREIGN KEY (run_id) REFERENCES timetable_runs(id) ON DELETE CASCADE,
    INDEX idx_run_lessons_run (run_id)
);

-- Scheduled jobs record each run so a restart never sends the same reminder twice
CREATE TABLE IF NOT EXISTS job_runs (
    job VARCHAR(100) NOT NULL,
    run_key VARCHAR(100) NOT NULL,
    ran_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (job, run_key)
);
