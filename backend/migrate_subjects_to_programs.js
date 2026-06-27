const db = require('./src/config/db');

async function migrate() {
    console.log('Starting migration: Renaming subjects to programs...');
    const connection = await db.getConnection();
    try {
        // Check if subjects exists, and programs doesn't
        const [tables] = await connection.execute("SHOW TABLES LIKE 'subjects'");
        if (tables.length > 0) {
            console.log('Renaming table `subjects` to `programs`...');
            await connection.execute('RENAME TABLE subjects TO programs');
        } else {
            console.log('Table `subjects` not found. Skip rename.');
        }

        // Check if lecturer_subjects exists, and lecturer_programs doesn't
        const [mappingTables] = await connection.execute("SHOW TABLES LIKE 'lecturer_subjects'");
        if (mappingTables.length > 0) {
            console.log('Renaming table `lecturer_subjects` to `lecturer_programs`...');
            await connection.execute('RENAME TABLE lecturer_subjects TO lecturer_programs');
        } else {
            console.log('Table `lecturer_subjects` not found. Skip rename.');
        }

        // Check if lecturer_programs has subject_id
        const [columns] = await connection.execute("SHOW COLUMNS FROM lecturer_programs LIKE 'subject_id'");
        if (columns.length > 0) {
            console.log('Renaming column `subject_id` to `program_id` in `lecturer_programs`...');
            const [fks] = await connection.execute(`
                SELECT CONSTRAINT_NAME
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_NAME = 'lecturer_programs' AND COLUMN_NAME = 'subject_id' AND TABLE_SCHEMA = DATABASE()
            `);
            if (fks.length > 0) {
                for (const fk of fks) {
                    if (fk.CONSTRAINT_NAME !== 'PRIMARY') {
                        await connection.execute(`ALTER TABLE lecturer_programs DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
                    }
                }
            }
            
            await connection.execute('ALTER TABLE lecturer_programs CHANGE COLUMN subject_id program_id INT NOT NULL');
            
            console.log('Re-adding foreign key constraint...');
            await connection.execute('ALTER TABLE lecturer_programs ADD CONSTRAINT fk_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE');
        } else {
            console.log('Column `subject_id` not found in `lecturer_programs`. Skip rename.');
        }

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

migrate();
