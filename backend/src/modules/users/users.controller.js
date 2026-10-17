const UserModel = require('./users.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { secret: jwtSecret } = require('../../config/jwt');

class UserController {
    static async register(req, res) {
        try {
            const { email, password, role } = req.body;
            if (role !== undefined && role !== 'STUDENT') {
                return res.status(400).json({ message: 'Public registration only supports student accounts.' });
            }
            if (typeof email !== 'string' || !email.includes('@') || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
                return res.status(400).json({ message: 'Provide a valid email and a password of at least 12 characters and at most 72 UTF-8 bytes.' });
            }
            
            const existingUser = await UserModel.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);

            const userId = await UserModel.create(email, passwordHash, 'STUDENT');

            res.status(201).json({ message: 'User registered successfully', userId });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Server error during registration' });
        }
    }

    static async login(req, res) {
        try {
            const { email, password } = req.body;
            
            const user = await UserModel.findByEmail(email);
            if (!user) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            if (!user.is_active) {
                return res.status(403).json({ message: 'Account is deactivated' });
            }

            const token = jwt.sign(
                { id: user.id, role: user.role, email: user.email },
                jwtSecret,
                { expiresIn: '1d' }
            );

            // Try to get user's display name from related tables
            let name = user.email.split('@')[0]; // default: email prefix
            try {
                const db = require('../../config/db');
                if (user.role === 'STUDENT') {
                    const [rows] = await db.execute('SELECT first_name, last_name FROM students WHERE user_id = ?', [user.id]);
                    if (rows.length > 0) name = rows[0].first_name + ' ' + rows[0].last_name;
                } else if (user.role === 'LECTURER') {
                    const [rows] = await db.execute('SELECT department FROM lecturers WHERE user_id = ?', [user.id]);
                    if (rows.length > 0) name = 'Prof. ' + user.email.split('@')[0];
                }
            } catch(e) { /* ignore, use default */ }

            res.json({ token, role: user.role, email: user.email, name, id: user.id });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Server error during login' });
        }
    }

    static async getProfile(req, res) {
        try {
            const db = require('../../config/db');
            let name = req.user.email.split('@')[0];
            let preferences = {};
            
            // Get user preferences
            const [userRows] = await db.execute('SELECT preferences FROM users WHERE id = ?', [req.user.id]);
            if (userRows.length > 0 && userRows[0].preferences) {
                try {
                    preferences = typeof userRows[0].preferences === 'string' 
                        ? JSON.parse(userRows[0].preferences) 
                        : userRows[0].preferences;
                } catch(e) {}
            }

            if (req.user.role === 'STUDENT') {
                const [rows] = await db.execute('SELECT first_name, last_name, profile_image_url, enrollment_number, gender FROM students WHERE user_id = ?', [req.user.id]);
                if (rows.length > 0) {
                    name = rows[0].first_name + ' ' + rows[0].last_name;
                    req.user.profileImageUrl = rows[0].profile_image_url;
                    req.user.enrollmentNumber = rows[0].enrollment_number;
                    req.user.gender = rows[0].gender;
                }
            } else if (req.user.role === 'LECTURER') {
                const [rows] = await db.execute('SELECT department FROM lecturers WHERE user_id = ?', [req.user.id]);
                if (rows.length > 0) name = 'Prof. ' + req.user.email.split('@')[0];
            }
            
            res.json({ message: 'Profile data', user: { ...req.user, name, preferences } });
        } catch (error) {
            console.error('Profile fetch error:', error);
            res.json({ message: 'Profile data', user: req.user });
        }
    }

    static async getAll(req, res) {
        try {
            const users = await UserModel.findAll();
            res.json(users);
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async update(req, res) {
        try {
            const { role, is_active } = req.body;
            // Since email is tied to the student/lecturer records often, we might just update role and status here.
            const db = require('../../config/db');
            
            // Get role_id
            let roleId;
            if (role) {
                const [roles] = await db.execute('SELECT id FROM roles WHERE name = ?', [role]);
                if (roles.length > 0) roleId = roles[0].id;
            }

            const updates = [];
            const values = [];

            if (roleId) {
                updates.push('role_id = ?');
                values.push(roleId);
            }
            if (is_active !== undefined) {
                updates.push('is_active = ?');
                values.push(is_active);
            }

            if (updates.length > 0) {
                values.push(req.params.id);
                const [result] = await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
                if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });
            }

            res.json({ message: 'User updated successfully' });
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async delete(req, res) {
        try {
            const affected = await UserModel.delete(req.params.id);
            if (affected === 0) return res.status(404).json({ message: 'User not found' });
            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async updatePreferences(req, res) {
        try {
            const db = require('../../config/db');
            const preferencesString = JSON.stringify(req.body);
            await db.execute('UPDATE users SET preferences = ? WHERE id = ?', [preferencesString, req.user.id]);
            res.json({ message: 'Preferences updated successfully', preferences: req.body });
        } catch (error) {
            console.error('Error updating preferences:', error);
            res.status(500).json({ message: 'Failed to update preferences' });
        }
    }

    static async updatePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const db = require('../../config/db');
            
            const [rows] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
            if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
            
            const user = rows[0];
            const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
            
            if (!validPassword) {
                return res.status(400).json({ message: 'Incorrect current password' });
            }

            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(newPassword, salt);

            await db.execute('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [passwordHash, req.user.id]);
            
            res.json({ message: 'Password updated successfully' });
        } catch (error) {
            console.error('Error updating password:', error);
            res.status(500).json({ message: 'Failed to update password' });
        }
    }
}

module.exports = UserController;
