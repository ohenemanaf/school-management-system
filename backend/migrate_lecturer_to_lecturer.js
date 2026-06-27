const db = require('./src/config/db');

async function migrate() {
    const connection = await db.getConnection();
    try {
        console.log('Starting deep refactor migration: Lecturer to Lecturer');
        await connection.beginTransaction();

        // 1. Rename tables
        console.log('Renaming tables...');
        
        const getFK = async (table, column) => {
            const [rows] = await connection.query(`
                SELECT CONSTRAINT_NAME 
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
            `, [table, column]);
            return rows.length > 0 ? rows[0].CONSTRAINT_NAME : null;
        };

        const fk1 = await getFK('lecturer_programs', 'lecturer_id');
        if (fk1) await connection.query(`ALTER TABLE lecturer_programs DROP FOREIGN KEY ${fk1}`);

        const fk2 = await getFK('lecturer_attendance', 'lecturer_id');
        if (fk2) await connection.query(`ALTER TABLE lecturer_attendance DROP FOREIGN KEY ${fk2}`);

        const fk3 = await getFK('timetable', 'lecturer_id');
        if (fk3) await connection.query(`ALTER TABLE timetable DROP FOREIGN KEY ${fk3}`);

        const fk4 = await getFK('classes', 'class_lecturer_id');
        if (fk4) await connection.query(`ALTER TABLE classes DROP FOREIGN KEY ${fk4}`);

        // Rename tables
        await connection.query(`RENAME TABLE lecturers TO lecturers`);
        await connection.query(`RENAME TABLE lecturer_programs TO lecturer_programs`);
        await connection.query(`RENAME TABLE lecturer_attendance TO lecturer_attendance`);

        // Rename columns and re-add FKs
        console.log('Renaming columns...');
        await connection.query(`ALTER TABLE lecturer_programs CHANGE lecturer_id lecturer_id INT NOT NULL`);
        await connection.query(`ALTER TABLE lecturer_programs ADD FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE`);

        await connection.query(`ALTER TABLE lecturer_attendance CHANGE lecturer_id lecturer_id INT NOT NULL`);
        await connection.query(`ALTER TABLE lecturer_attendance ADD FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE CASCADE`);

        await connection.query(`ALTER TABLE timetable CHANGE lecturer_id lecturer_id INT NULL`);
        await connection.query(`ALTER TABLE timetable ADD FOREIGN KEY (lecturer_id) REFERENCES lecturers(id) ON DELETE SET NULL`);

        // Classes table might not exist or might fail if it doesn't exist
        const [tables] = await connection.query("SHOW TABLES LIKE 'classes'");
        if (tables.length > 0) {
            await connection.query(`ALTER TABLE classes CHANGE class_lecturer_id class_lecturer_id INT NULL`);
            await connection.query(`ALTER TABLE classes ADD FOREIGN KEY (class_lecturer_id) REFERENCES lecturers(id) ON DELETE SET NULL`);
        }

        // Update ENUMs/Roles table
        console.log('Updating roles table...');
        await connection.query(`UPDATE roles SET name = 'LECTURER', description = 'Lecturer with access to student records and grading' WHERE name = 'LECTURER'`);

        await connection.commit();
        console.log('Migration completed successfully!');

    } catch (error) {
        await connection.rollback();
        console.error('Migration failed:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

migrate();
