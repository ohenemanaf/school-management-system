const db = require('./src/config/db');

async function migrate() {
    const connection = await db.getConnection();
    try {
        console.log('Adding program_id to student_groups...');
        
        // Check if column already exists
        const [columns] = await connection.execute("SHOW COLUMNS FROM student_groups LIKE 'program_id'");
        if (columns.length === 0) {
            await connection.execute('ALTER TABLE student_groups ADD COLUMN program_id INT NULL');
            await connection.execute('ALTER TABLE student_groups ADD CONSTRAINT fk_student_group_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL');
            console.log('Added program_id successfully.');
        } else {
            console.log('Column program_id already exists.');
        }
        
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

migrate();
