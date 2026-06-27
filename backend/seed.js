const db = require('./src/config/db');
const bcrypt = require('bcrypt');

async function seed() {
    try {
        console.log('Starting database seed...');

        // Create default roles if they don't exist
        await db.execute(`
            INSERT IGNORE INTO roles (name, description) VALUES
            ('ADMIN', 'Administrator with full access'),
            ('LECTURER', 'Lecturer with access to student records and grading'),
            ('STUDENT', 'Student with access to own records')
        `);
        console.log('Roles seeded.');

        // Get admin role ID
        const [adminRoles] = await db.execute('SELECT id FROM roles WHERE name = ?', ['ADMIN']);
        const adminRoleId = adminRoles[0].id;

        // Create default Admin User
        const adminEmail = 'admin@educore.com';
        const passwordHash = await bcrypt.hash('password123', 10);
        
        const [existingAdmin] = await db.execute('SELECT id FROM users WHERE email = ?', [adminEmail]);
        if (existingAdmin.length === 0) {
            await db.execute(
                'INSERT INTO users (role_id, email, password_hash) VALUES (?, ?, ?)',
                [adminRoleId, adminEmail, passwordHash]
            );
            console.log('Admin user created (admin@educore.com / password123).');
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
