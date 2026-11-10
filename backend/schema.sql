-- Database Schema for School Management System

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- Insert default roles
INSERT IGNORE INTO roles (name, description) VALUES
('ADMIN', 'Administrator with full access'),
('SUPER_ADMIN', 'Super Administrator with total system access'),
('HEADMASTER', 'Headmaster with global read-only analytics'),
('ACCOUNTANT', 'Finance Controller for fees and expenses'),
('LIBRARIAN', 'Resource Manager for library operations'),
('LECTURER', 'Lecturer with access to student records and grading'),
('STUDENT', 'Student with access to own records'),
('GATEKEEPER', 'Security guard for token generation');

-- Create programs table
CREATE TABLE IF NOT EXISTS programs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE
);

-- Streams: parallel sections of a level (e.g. Gold, Diamond)
CREATE TABLE IF NOT EXISTS streams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    sort_order INT NOT NULL DEFAULT 0
);

-- Create student_groups table (The People)
CREATE TABLE IF NOT EXISTS student_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    level VARCHAR(50) NOT NULL,
    program_id INT NULL,
    stream_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL,
    FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE SET NULL
);

-- Create rooms table (The Physical Space)
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    capacity INT DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    must_change_password BOOLEAN DEFAULT FALSE,
    preferences JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    enrollment_number VARCHAR(50) NOT NULL UNIQUE,
    date_of_birth DATE,
    gender ENUM('Male', 'Female', 'Other'),
    profile_image_url VARCHAR(255) NULL,
    address TEXT,
    guardian_name VARCHAR(100),
    guardian_phone VARCHAR(20),
    medical_conditions TEXT,
    blood_group VARCHAR(5),
    student_group_id INT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_group_id) REFERENCES student_groups(id) ON DELETE SET NULL
);

-- Create lecturers table
CREATE TABLE IF NOT EXISTS lecturers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    first_name VARCHAR(100) NULL,
    last_name VARCHAR(100) NULL,
    department VARCHAR(100) NOT NULL,
    hire_date DATE,
    max_periods_per_week INT NOT NULL DEFAULT 25,
    max_periods_per_day INT NOT NULL DEFAULT 6,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create lecturer_programs mapping table
CREATE TABLE IF NOT EXISTS lecturer_programs (
    lecturer_id INT NOT NULL,
    program_id INT NOT NULL,
    PRIMARY KEY (lecturer_id, program_id),
    FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE,
    is_heavy BOOLEAN NOT NULL DEFAULT FALSE
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    student_group_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('Present', 'Absent', 'Late') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (student_group_id) REFERENCES student_groups(id) ON DELETE CASCADE,
    UNIQUE KEY student_group_date (student_id, student_group_id, date),
    INDEX idx_attendance_group_date (student_group_id, date),
    INDEX idx_attendance_date (date)
);

-- Create grades table
CREATE TABLE IF NOT EXISTS grades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    student_group_id INT NOT NULL,
    assessment_name VARCHAR(100) NOT NULL,
    score DECIMAL(5, 2) NOT NULL,
    max_score DECIMAL(5, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (student_group_id) REFERENCES student_groups(id) ON DELETE CASCADE,
    INDEX idx_grades_created (created_at)
);

-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_group_id INT NOT NULL,
    lecturer_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_group_id) REFERENCES student_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE
);

-- Create lecturer_attendance table
CREATE TABLE IF NOT EXISTS lecturer_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lecturer_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('Present', 'Absent', 'On Leave') NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE,
    UNIQUE KEY lecturer_date (lecturer_id, date),
    INDEX idx_lecturer_attendance_date (date)
);

-- Create timetable_sessions table (The Event that ties them together)
CREATE TABLE IF NOT EXISTS timetable_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    student_group_id INT NOT NULL,
    lecturer_id INT NOT NULL,
    room_id INT NOT NULL,
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_group_id) REFERENCES student_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE RESTRICT,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_lecturer_timeslot (lecturer_id, day_of_week, start_time),
    UNIQUE KEY unique_group_timeslot (student_group_id, day_of_week, start_time),
    UNIQUE KEY unique_room_timeslot (room_id, day_of_week, start_time)
);

-- Create gate_tokens table
CREATE TABLE IF NOT EXISTS gate_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(6) NOT NULL UNIQUE,
    is_used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_gate_tokens_expires (expires_at)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT, -- NULL means broadcast to everyone
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('INFO', 'ALERT', 'SUCCESS', 'WARNING') DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user_created (user_id, created_at)
);

-- Per-user read receipts for school-wide (user_id IS NULL) notifications
CREATE TABLE IF NOT EXISTS notification_reads (
    notification_id INT NOT NULL,
    user_id INT NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notification_id, user_id),
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- LIBRARY MODULE TABLES
CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(50) UNIQUE,
    category VARCHAR(100),
    total_copies INT DEFAULT 1,
    available_copies INT DEFAULT 1,
    pdf_url VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS book_loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    user_id INT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE,
    status ENUM('Borrowed', 'Returned', 'Overdue') DEFAULT 'Borrowed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_loans_status_due (status, due_date)
);

CREATE TABLE IF NOT EXISTS book_class_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    student_group_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (student_group_id) REFERENCES student_groups(id) ON DELETE CASCADE,
    UNIQUE KEY unique_book_group (book_id, student_group_id)
);

-- FINANCE MODULE TABLES
CREATE TABLE IF NOT EXISTS fee_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    fee_type_id INT NOT NULL,
    amount_due DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('Pending', 'Partial', 'Paid') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (fee_type_id) REFERENCES fee_types(id) ON DELETE RESTRICT,
    INDEX idx_invoices_status (status),
    INDEX idx_invoices_created (created_at)
);

CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('Cash', 'Bank Transfer', 'Mobile Money', 'Cheque') DEFAULT 'Cash',
    reference_number VARCHAR(100),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

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
