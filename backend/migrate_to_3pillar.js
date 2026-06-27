/**
 * Migration Script: Migrate existing database to the new 3-Pillar Architecture
 * 
 * This script:
 * 1. Creates `student_groups` and `rooms` tables if they don't exist
 * 2. Adds `student_group_id` column to `students` if it doesn't exist
 * 3. Creates `timetable_sessions` table if it doesn't exist
 * 4. Updates `attendance`, `grades`, `materials` tables to add `student_group_id` if missing
 */

require('dotenv').config();
const db = require('./src/config/db');

async function migrate() {
    const connection = await db.getConnection();
    
    try {
        console.log('🚀 Starting database migration to 3-Pillar Architecture...\n');

        // 1. Create student_groups table
        console.log('1️⃣  Creating student_groups table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS student_groups (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                level VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ student_groups table ready.\n');

        // 2. Create rooms table
        console.log('2️⃣  Creating rooms table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS rooms (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                capacity INT DEFAULT 30,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ rooms table ready.\n');

        // 3. Add student_group_id to students table if it doesn't exist
        console.log('3️⃣  Updating students table...');
        const [studentCols] = await connection.execute(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students' AND COLUMN_NAME = 'student_group_id'
        `);
        if (studentCols.length === 0) {
            await connection.execute(`ALTER TABLE students ADD COLUMN student_group_id INT NULL`);
            await connection.execute(`ALTER TABLE students ADD CONSTRAINT fk_students_group FOREIGN KEY (student_group_id) REFERENCES student_groups(id) ON DELETE SET NULL`);
            console.log('   ✅ Added student_group_id column to students.\n');
        } else {
            console.log('   ⏭️  student_group_id already exists in students.\n');
        }

        // 4. Add student_group_id to attendance table if it doesn't exist
        console.log('4️⃣  Updating attendance table...');
        const [attCols] = await connection.execute(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'attendance' AND COLUMN_NAME = 'student_group_id'
        `);
        if (attCols.length === 0) {
            await connection.execute(`ALTER TABLE attendance ADD COLUMN student_group_id INT NULL`);
            console.log('   ✅ Added student_group_id to attendance.\n');
        } else {
            console.log('   ⏭️  student_group_id already exists in attendance.\n');
        }

        // 5. Add student_group_id to grades table if it doesn't exist
        console.log('5️⃣  Updating grades table...');
        const [gradesCols] = await connection.execute(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'grades' AND COLUMN_NAME = 'student_group_id'
        `);
        if (gradesCols.length === 0) {
            await connection.execute(`ALTER TABLE grades ADD COLUMN student_group_id INT NULL`);
            console.log('   ✅ Added student_group_id to grades.\n');
        } else {
            console.log('   ⏭️  student_group_id already exists in grades.\n');
        }

        // 6. Add student_group_id to materials table if it doesn't exist
        console.log('6️⃣  Updating materials table...');
        const [matCols] = await connection.execute(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'materials' AND COLUMN_NAME = 'student_group_id'
        `);
        if (matCols.length === 0) {
            await connection.execute(`ALTER TABLE materials ADD COLUMN student_group_id INT NULL`);
            console.log('   ✅ Added student_group_id to materials.\n');
        } else {
            console.log('   ⏭️  student_group_id already exists in materials.\n');
        }

        // 7. Create courses table if it doesn't exist
        console.log('7️⃣  Creating courses table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS courses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                code VARCHAR(20) UNIQUE
            )
        `);
        console.log('   ✅ courses table ready.\n');

        // 8. Create timetable_sessions table
        console.log('8️⃣  Creating timetable_sessions table...');
        await connection.execute(`
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
                FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT
            )
        `);
        console.log('   ✅ timetable_sessions table ready.\n');

        console.log('═══════════════════════════════════════════════');
        console.log('🎉 Migration completed successfully!');
        console.log('═══════════════════════════════════════════════');
        console.log('\nYour existing student data has been preserved.');
        console.log('Students currently have student_group_id = NULL.');
        console.log('You can assign them to groups via the admin UI.\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
    } finally {
        connection.release();
        process.exit(0);
    }
}

migrate();
