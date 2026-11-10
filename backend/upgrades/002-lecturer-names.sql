-- Upgrade for databases created from schema.sql before lecturer names existed.
-- New installations already include these columns; do not run it on them.
-- Run once, after a backup:  mysql -u <user> -p <database> < backend/upgrades/002-lecturer-names.sql
-- Additive only: existing lecturers keep working with empty names until an admin fills them in.

ALTER TABLE lecturers
    ADD COLUMN first_name VARCHAR(100) NULL AFTER user_id,
    ADD COLUMN last_name VARCHAR(100) NULL AFTER first_name;
