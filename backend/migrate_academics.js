require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
    console.log("Starting academics migration...");
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_system'
    });

    try {
        await connection.beginTransaction();

        console.log("Creating sections table...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS sections (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE
            );
        `);

        console.log("Creating levels table...");
        await connection.query(`
            CREATE TABLE IF NOT EXISTS levels (
                id INT AUTO_INCREMENT PRIMARY KEY,
                section_id INT NOT NULL,
                name VARCHAR(50) NOT NULL,
                FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
                UNIQUE KEY section_level (section_id, name)
            );
        `);

        // Check if level_id exists in classes
        const [classColumns] = await connection.query("SHOW COLUMNS FROM classes LIKE 'level_id'");
        if (classColumns.length === 0) {
            console.log("Inserting Legacy Section and Legacy Level...");
            const [sectionResult] = await connection.query(`INSERT IGNORE INTO sections (name) VALUES ('Legacy Section')`);
            let sectionId = sectionResult.insertId;
            if (sectionId === 0) {
                 const [sec] = await connection.query(`SELECT id FROM sections WHERE name = 'Legacy Section'`);
                 sectionId = sec[0].id;
            }

            const [levelResult] = await connection.query(`INSERT IGNORE INTO levels (section_id, name) VALUES (?, 'Legacy Level')`, [sectionId]);
            let levelId = levelResult.insertId;
            if (levelId === 0) {
                 const [lvl] = await connection.query(`SELECT id FROM levels WHERE section_id = ? AND name = 'Legacy Level'`, [sectionId]);
                 levelId = lvl[0].id;
            }

            console.log("Altering classes table to add level_id...");
            await connection.query(`ALTER TABLE classes ADD COLUMN level_id INT NULL`);
            
            console.log("Updating existing classes to Legacy Level...");
            await connection.query(`UPDATE classes SET level_id = ?`, [levelId]);
            
            console.log("Making level_id NOT NULL and adding foreign key...");
            await connection.query(`ALTER TABLE classes MODIFY COLUMN level_id INT NOT NULL`);
            await connection.query(`ALTER TABLE classes ADD FOREIGN KEY (level_id) REFERENCES levels(id) ON DELETE CASCADE`);
        } else {
            console.log("classes.level_id already exists. Skipping classes modification.");
        }

        // Check if class_id exists in students
        const [studentColumns] = await connection.query("SHOW COLUMNS FROM students LIKE 'class_id'");
        if (studentColumns.length === 0) {
            console.log("Altering students table to add class_id...");
            await connection.query(`ALTER TABLE students ADD COLUMN class_id INT NULL`);
            await connection.query(`ALTER TABLE students ADD FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL`);
        } else {
            console.log("students.class_id already exists. Skipping students modification.");
        }

        await connection.commit();
        console.log("Migration completed successfully!");

    } catch (error) {
        await connection.rollback();
        console.error("Migration failed, transaction rolled back.");
        console.error(error);
    } finally {
        await connection.end();
    }
}

migrate();
