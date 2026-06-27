const db = require('./src/config/db');

async function fixRoles() {
    const connection = await db.getConnection();
    try {
        await connection.query(`UPDATE roles SET name = 'LECTURER', description = 'Lecturer with access to student records and grading' WHERE name = 'LECTURER'`);
        console.log('Roles updated.');
    } catch (e) {
        console.error(e);
    } finally {
        connection.release();
        process.exit();
    }
}
fixRoles();
