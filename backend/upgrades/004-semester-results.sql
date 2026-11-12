-- Upgrade for databases created before semester results (subjects, terms and
-- class/exam type on grades; credit hours; results release; grading scale).
-- New installations already include everything below; do not run it on them.
-- Run once, after a backup:  mysql -u <user> -p <database> < backend/upgrades/004-semester-results.sql
-- Adds columns and a table, and files existing grades under the term whose dates
-- contain them. No data is deleted.

-- SEMESTER RESULTS
-- Credit hours weight a subject in the GPA
ALTER TABLE courses
    ADD COLUMN credit_hours INT NOT NULL DEFAULT 3;

-- Per term: share of the total that class work counts for (exam = the rest),
-- and whether students may see their results yet
ALTER TABLE terms
    ADD COLUMN ca_weight INT NOT NULL DEFAULT 30,
    ADD COLUMN results_released BOOLEAN NOT NULL DEFAULT FALSE;

-- Each grade belongs to a subject and a term and is class work or an exam
ALTER TABLE grades
    ADD COLUMN course_id INT NULL,
    ADD COLUMN term_id INT NULL,
    ADD COLUMN component ENUM('CLASS', 'EXAM') NOT NULL DEFAULT 'CLASS',
    ADD CONSTRAINT fk_grades_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_grades_term FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE SET NULL,
    ADD INDEX idx_grades_student_term (student_id, term_id);

-- Mark bands for letter grades and grade points (edit the rows to change the scale)
CREATE TABLE IF NOT EXISTS grading_scale (
    id INT AUTO_INCREMENT PRIMARY KEY,
    min_score DECIMAL(5, 2) NOT NULL UNIQUE,
    grade VARCHAR(5) NOT NULL UNIQUE,
    grade_point DECIMAL(3, 2) NOT NULL,
    remark VARCHAR(50) NOT NULL
);

INSERT IGNORE INTO grading_scale (min_score, grade, grade_point, remark) VALUES
(80, 'A', 4.00, 'Excellent'),
(75, 'B+', 3.50, 'Very good'),
(70, 'B', 3.00, 'Good'),
(65, 'C+', 2.50, 'Fairly good'),
(60, 'C', 2.00, 'Average'),
(55, 'D+', 1.50, 'Below average'),
(50, 'D', 1.00, 'Marginal pass'),
(0, 'F', 0.00, 'Fail');

-- Existing grades: file each under the term its date falls in (subject stays unknown).
UPDATE grades g
JOIN terms t ON DATE(g.created_at) BETWEEN t.start_date AND t.end_date
SET g.term_id = t.id WHERE g.term_id IS NULL;
