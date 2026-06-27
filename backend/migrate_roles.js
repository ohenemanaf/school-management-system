require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrateRoles() {
    console.log("Starting RBAC role migration...");
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'school_db'
    });

    try {
        await connection.beginTransaction();

        const roles = [
            ['SUPER_ADMIN', 'Super Administrator with total system access'],
            ['HEADMASTER', 'Headmaster with global read-only analytics'],
            ['ACCOUNTANT', 'Finance Controller for fees and expenses'],
            ['LIBRARIAN', 'Resource Manager for library operations']
        ];

        console.log("Inserting new roles...");
        for (const [name, description] of roles) {
            await connection.execute(
                'INSERT IGNORE INTO roles (name, description) VALUES (?, ?)',
                [name, description]
            );
        }

        await connection.commit();
        console.log("RBAC role migration completed successfully!");
    } catch (error) {
        await connection.rollback();
        console.error("Migration failed:", error);
    } finally {
        await connection.end();
    }
}

migrateRoles();
