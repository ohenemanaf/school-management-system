const db = require('./src/config/db');

async function migrate() {
    try {
        console.log('Dropping foreign keys pointing to old tables...');
        try { await db.execute('ALTER TABLE students DROP FOREIGN KEY students_ibfk_2'); } catch(e) {}
        try { await db.execute('ALTER TABLE attendance DROP FOREIGN KEY attendance_ibfk_2'); } catch(e) {}
        try { await db.execute('ALTER TABLE grades DROP FOREIGN KEY grades_ibfk_2'); } catch(e) {}
        try { await db.execute('ALTER TABLE materials DROP FOREIGN KEY materials_ibfk_1'); } catch(e) {}
        try { await db.execute('ALTER TABLE timetable DROP FOREIGN KEY timetable_ibfk_1'); } catch(e) {}
        try { await db.execute('ALTER TABLE timetable DROP INDEX unique_class_timeslot'); } catch(e) {}

        console.log('Dropping old tables...');
        await db.execute('SET FOREIGN_KEY_CHECKS = 0');
        try { await db.execute('DROP TABLE IF EXISTS classes'); } catch(e) {}
        try { await db.execute('DROP TABLE IF EXISTS levels'); } catch(e) {}
        try { await db.execute('DROP TABLE IF EXISTS sections'); } catch(e) {}
        await db.execute('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('Creating courses table...');
        await db.execute('CREATE TABLE IF NOT EXISTS courses (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, code VARCHAR(20) UNIQUE)');

        console.log('Creating classes table...');
        await db.execute('CREATE TABLE IF NOT EXISTS classes (id INT AUTO_INCREMENT PRIMARY KEY, course_id INT NOT NULL, name VARCHAR(100) NOT NULL, class_lecturer_id INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE, FOREIGN KEY (class_lecturer_id) REFERENCES users(id) ON DELETE SET NULL, UNIQUE KEY course_class (course_id, name))');

        console.log('Creating sections table...');
        await db.execute('CREATE TABLE IF NOT EXISTS sections (id INT AUTO_INCREMENT PRIMARY KEY, class_id INT NOT NULL, name VARCHAR(50) NOT NULL, capacity INT DEFAULT 30, FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE, UNIQUE KEY class_section (class_id, name))');

        console.log('Updating students, attendance, grades, materials, timetable columns to section_id...');
        try { await db.execute('ALTER TABLE students CHANGE class_id section_id INT NULL'); } catch(e) {}
        try { await db.execute('ALTER TABLE attendance CHANGE class_id section_id INT NOT NULL'); } catch(e) {}
        try { await db.execute('ALTER TABLE grades CHANGE class_id section_id INT NOT NULL'); } catch(e) {}
        try { await db.execute('ALTER TABLE materials CHANGE class_id section_id INT NOT NULL'); } catch(e) {}
        try { await db.execute('ALTER TABLE timetable CHANGE class_id section_id INT NOT NULL'); } catch(e) {}

        console.log('Re-adding foreign keys to section_id...');
        try { await db.execute('ALTER TABLE students ADD FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL'); } catch(e) { console.error('st fk fail') }
        try { await db.execute('ALTER TABLE attendance ADD FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE'); } catch(e) { console.error('att fk fail') }
        try { await db.execute('ALTER TABLE grades ADD FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE'); } catch(e) { console.error('gr fk fail') }
        try { await db.execute('ALTER TABLE materials ADD FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE'); } catch(e) { console.error('mat fk fail') }
        try { await db.execute('ALTER TABLE timetable ADD FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE'); } catch(e) { console.error('tt fk fail') }
        try { await db.execute('ALTER TABLE timetable ADD UNIQUE KEY unique_section_timeslot (section_id, day_of_week, start_time)'); } catch(e) { console.error('tt uniq fail') }

        console.log('Seeding demo data...');
        await db.execute('INSERT IGNORE INTO courses (id, name, code) VALUES (1, "BSc Computer Science", "CS"), (2, "BSc Information Technology", "IT")');
        await db.execute('INSERT IGNORE INTO classes (id, course_id, name) VALUES (1, 1, "Level 100"), (2, 1, "Level 200"), (3, 2, "Level 100")');
        await db.execute('INSERT IGNORE INTO sections (id, class_id, name, capacity) VALUES (1, 1, "Morning", 50), (2, 1, "Evening", 40), (3, 2, "Morning", 50)');

        console.log('Migration complete!');
    } catch(e) {
        console.error('Migration failed:', e);
    } finally {
        process.exit();
    }
}
migrate();
