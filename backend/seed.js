require('dotenv').config();
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminEmail || !adminEmail.includes('@') || !adminPassword || adminPassword.length < 12 || Buffer.byteLength(adminPassword, 'utf8') > 72) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters and at most 72 UTF-8 bytes) before seeding.');
    process.exit(1);
}
const db = require('./src/config/db');
const bcrypt = require('bcrypt');

async function seed() {
    try {
        console.log('Starting database seed...');

        // Create default roles if they don't exist
        await db.execute(`
            INSERT IGNORE INTO roles (name, description) VALUES
            ('SUPER_ADMIN', 'Super Administrator with total system access'),
            ('ADMIN', 'Administrator with full access'),
            ('LECTURER', 'Lecturer with access to student records and grading'),
            ('STUDENT', 'Student with access to own records')
        `);
        console.log('Roles seeded.');

        // Get admin role ID
        const [adminRoles] = await db.execute('SELECT id FROM roles WHERE name = ?', ['SUPER_ADMIN']);
        const adminRoleId = adminRoles[0].id;

        // Create default Admin User
        const passwordHash = await bcrypt.hash(adminPassword, 10);
        
        const [existingAdmin] = await db.execute('SELECT id FROM users WHERE email = ?', [adminEmail]);
        if (existingAdmin.length === 0) {
            await db.execute(
                'INSERT INTO users (role_id, email, password_hash) VALUES (?, ?, ?)',
                [adminRoleId, adminEmail, passwordHash]
            );
            console.log('Initial super administrator created.');
        } else {
            console.log('Admin user already exists.');
        }

        console.log('Database seed complete!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seed();
