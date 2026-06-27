const db = require('./src/config/db');

async function migrate() {
    try {
        console.log('Creating programs table...');
        await db.execute('CREATE TABLE IF NOT EXISTS programs (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, code VARCHAR(20) UNIQUE)');
        
        console.log('Creating student_groups table...');
        await db.execute('CREATE TABLE IF NOT EXISTS student_groups (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE, level VARCHAR(50) NOT NULL, program_id INT NULL, FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL)');

        console.log('Creating lecturer_programs table...');
        await db.execute('CREATE TABLE IF NOT EXISTS lecturer_programs (lecturer_id INT NOT NULL, program_id INT NOT NULL, PRIMARY KEY (lecturer_id, program_id), FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE, FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE)');
        
        console.log('Updating classes table...');
        try { await db.execute('ALTER TABLE classes DROP FOREIGN KEY classes_ibfk_2'); } catch(e) { console.log('ignore fk drop error'); }
        try { await db.execute('ALTER TABLE classes RENAME COLUMN lecturer_id TO class_lecturer_id'); } catch(e) { console.log('ignore rename error'); }
        try { await db.execute('ALTER TABLE classes ADD FOREIGN KEY (class_lecturer_id) REFERENCES users(id) ON DELETE SET NULL'); } catch(e) { console.log('ignore fk add error'); }

        console.log('Updating timetable table...');
        await db.execute('TRUNCATE TABLE timetable');
        try { await db.execute('ALTER TABLE timetable DROP COLUMN subject_name'); } catch(e) { console.log('ignore drop col error'); }
        try { 
            await db.execute('ALTER TABLE timetable ADD COLUMN subject_id INT NOT NULL AFTER lecturer_id');
            await db.execute('ALTER TABLE timetable ADD FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT');
        } catch(e) { console.log('ignore add col error'); }
        
        try { await db.execute('ALTER TABLE timetable ADD UNIQUE KEY unique_lecturer_timeslot (lecturer_id, day_of_week, start_time)'); } catch(e) { console.log('ignore unique 1 error'); }
        try { await db.execute('ALTER TABLE timetable ADD UNIQUE KEY unique_class_timeslot (class_id, day_of_week, start_time)'); } catch(e) { console.log('ignore unique 2 error'); }

        console.log('Migration complete!');
    } catch(e) {
        console.error('Migration failed:', e);
    } finally {
        process.exit();
    }
}
migrate();
