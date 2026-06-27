const csv = require('csv-parser');
const stream = require('stream');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../../config/db');
const emailService = require('../../utils/emailService');

class StudentBulkController {
    static async uploadBulk(req, res) {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const results = [];
        const bufferStream = new stream.PassThrough();
        bufferStream.end(req.file.buffer);

        bufferStream
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                const connection = await db.getConnection();
                
                try {
                    await connection.beginTransaction();

                    const [roles] = await connection.execute('SELECT id FROM roles WHERE name = ?', ['STUDENT']);
                    if (roles.length === 0) {
                        throw new Error("Role 'STUDENT' not found");
                    }
                    const roleId = roles[0].id;

                    const successfulUploads = [];
                    const failedUploads = [];

                    for (const row of results) {
                        // Expected CSV headers: firstName, lastName, email, enrollmentNumber, dateOfBirth, gender
                        const firstName = row['First Name'] || row.firstName || row.first_name;
                        const lastName = row['Last Name'] || row.lastName || row.last_name;
                        const email = row['Email'] || row.email;
                        const enrollmentNumber = row['Index Number'] || row.enrollmentNumber || row.enrollment_number;
                        const dateOfBirth = row['Date of Birth'] || row.dateOfBirth || row.date_of_birth || null;
                        const gender = row['Gender'] || row.gender || 'Other';

                        if (!firstName || !lastName || !email || !enrollmentNumber) {
                            failedUploads.push({ row, reason: 'Missing required fields (First Name, Last Name, Email, or Index Number)' });
                            continue;
                        }

                        // Check if user already exists
                        const [existingUser] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
                        if (existingUser.length > 0) {
                            failedUploads.push({ email, reason: 'Email already exists' });
                            continue;
                        }

                        // Generate plain text password
                        const plaintextPassword = crypto.randomBytes(4).toString('hex'); // 8 characters
                        const salt = await bcrypt.genSalt(10);
                        const passwordHash = await bcrypt.hash(plaintextPassword, salt);

                        // Insert into users
                        const [userResult] = await connection.execute(
                            'INSERT INTO users (role_id, email, password_hash, must_change_password) VALUES (?, ?, ?, ?)',
                            [roleId, email, passwordHash, true]
                        );
                        
                        const userId = userResult.insertId;

                        // Insert into students
                        await connection.execute(
                            'INSERT INTO students (user_id, first_name, last_name, enrollment_number, date_of_birth, gender) VALUES (?, ?, ?, ?, ?, ?)',
                            [userId, firstName, lastName, enrollmentNumber, dateOfBirth, gender]
                        );

                        // Queue welcome email
                        await emailService.sendWelcomeEmail(email, firstName, enrollmentNumber, plaintextPassword);

                        successfulUploads.push(email);
                    }

                    await connection.commit();

                    res.status(200).json({
                        message: 'Bulk upload completed',
                        successful: successfulUploads.length,
                        failed: failedUploads.length,
                        failedDetails: failedUploads
                    });
                } catch (error) {
                    await connection.rollback();
                    console.error('Bulk upload transaction failed:', error);
                    res.status(500).json({ message: 'Server error during bulk upload transaction' });
                } finally {
                    connection.release();
                }
            })
            .on('error', (error) => {
                console.error('Error parsing CSV:', error);
                res.status(500).json({ message: 'Error parsing CSV file' });
            });
    }
}

module.exports = StudentBulkController;
