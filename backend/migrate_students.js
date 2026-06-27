const db = require('./src/config/db');

async function migrate() {
    try {
        console.log('Starting migration...');
        
        await db.execute(`
            ALTER TABLE students 
            ADD COLUMN profile_image_url VARCHAR(255) NULL,
            ADD COLUMN address TEXT,
            ADD COLUMN guardian_name VARCHAR(100),
            ADD COLUMN guardian_phone VARCHAR(20),
            ADD COLUMN medical_conditions TEXT,
            ADD COLUMN blood_group VARCHAR(5);
        `);
        
        console.log('Migration successful!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
