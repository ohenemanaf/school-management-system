-- Upgrade for databases created from schema.sql before 2026-11-10.
-- New installations already include everything below; do not run it on them.
-- Run once, after a backup:  mysql -u <user> -p <database> < backend/upgrades/001-indexes-and-notification-reads.sql
-- Each statement is additive (new table and indexes only); no data is changed or removed.

CREATE TABLE IF NOT EXISTS notification_reads (
    notification_id INT NOT NULL,
    user_id INT NOT NULL,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notification_id, user_id),
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_attendance_group_date ON attendance (student_group_id, date);
CREATE INDEX idx_attendance_date ON attendance (date);
CREATE INDEX idx_grades_created ON grades (created_at);
CREATE INDEX idx_lecturer_attendance_date ON lecturer_attendance (date);
CREATE INDEX idx_gate_tokens_expires ON gate_tokens (expires_at);
CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at);
CREATE INDEX idx_loans_status_due ON book_loans (status, due_date);
CREATE INDEX idx_invoices_status ON invoices (status);
CREATE INDEX idx_invoices_created ON invoices (created_at);
