const UserModel = require('./users.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const { secret: jwtSecret } = require('../../config/jwt');
const { validatePassword, hashPassword } = require('../../utils/passwords');
const { signUploadUrl } = require('../../utils/signedUploads');

async function displayNameFor(user) {
    const fallback = user.email.split('@')[0];
    if (user.role === 'STUDENT') {
        const [rows] = await db.execute('SELECT first_name, last_name FROM students WHERE user_id = ?', [user.id]);
        if (rows.length > 0) return `${rows[0].first_name} ${rows[0].last_name}`;
    } else if (user.role === 'LECTURER') {
        const [rows] = await db.execute('SELECT first_name, last_name FROM lecturers WHERE user_id = ?', [user.id]);
        const full = [rows[0]?.first_name, rows[0]?.last_name].filter(Boolean).join(' ');
        if (full) return full;
    }
    return fallback;
}

class UserController {
    static async register(req, res) {
        try {
            if (process.env.ALLOW_PUBLIC_REGISTRATION === 'false') {
                return res.status(403).json({ message: 'Public registration is disabled.' });
            }
            const { email, password, role } = req.body;
            if (role !== undefined && role !== 'STUDENT') {
                return res.status(400).json({ message: 'Public registration only supports student accounts.' });
            }
            const passwordError = validatePassword(password);
            if (typeof email !== 'string' || !email.includes('@') || passwordError) {
                return res.status(400).json({ message: passwordError || 'Provide a valid email address.' });
            }

            const existingUser = await UserModel.findByEmail(email);
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }

            const userId = await UserModel.create(email, await hashPassword(password), 'STUDENT');
            res.status(201).json({ message: 'User registered successfully', userId });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ message: 'Server error during registration' });
        }
    }

    static async login(req, res) {
        try {
            const { email, password } = req.body;
            if (typeof email !== 'string' || typeof password !== 'string') {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            const user = await UserModel.findByEmail(email);
            if (!user || !(await bcrypt.compare(password, user.password_hash))) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }
            if (!user.is_active) {
                return res.status(403).json({ message: 'Account is deactivated' });
            }

            const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, jwtSecret, { expiresIn: '1d' });
            res.json({
                token,
                role: user.role,
                email: user.email,
                name: await displayNameFor(user),
                id: user.id,
                mustChangePassword: Boolean(user.must_change_password),
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ message: 'Server error during login' });
        }
    }

    static async getProfile(req, res) {
        try {
            const profile = { ...req.user, name: await displayNameFor(req.user), preferences: {} };

            const [userRows] = await db.execute('SELECT preferences FROM users WHERE id = ?', [req.user.id]);
            const stored = userRows[0]?.preferences;
            if (stored) {
                try {
                    profile.preferences = typeof stored === 'string' ? JSON.parse(stored) : stored;
                } catch { /* keep defaults for malformed preferences */ }
            }

            if (req.user.role === 'STUDENT') {
                const [rows] = await db.execute(
                    'SELECT id, profile_image_url, enrollment_number, gender, student_group_id, medical_conditions, blood_group FROM students WHERE user_id = ?',
                    [req.user.id]
                );
                if (rows.length > 0) {
                    profile.studentId = rows[0].id;
                    profile.profileImageUrl = signUploadUrl(rows[0].profile_image_url);
                    profile.enrollmentNumber = rows[0].enrollment_number;
                    profile.gender = rows[0].gender;
                    profile.studentGroupId = rows[0].student_group_id;
                    // A student may always see their own health details.
                    profile.medicalConditions = rows[0].medical_conditions;
                    profile.bloodGroup = rows[0].blood_group;
                }
            } else if (req.user.role === 'LECTURER') {
                const [rows] = await db.execute('SELECT id FROM lecturers WHERE user_id = ?', [req.user.id]);
                if (rows.length > 0) profile.lecturerId = rows[0].id;
            }

            res.json({ message: 'Profile data', user: profile });
        } catch (error) {
            console.error('Profile fetch error:', error);
            res.status(500).json({ message: 'Failed to load profile' });
        }
    }

    static async getAll(req, res) {
        try {
            res.json(await UserModel.findAll());
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async update(req, res) {
        try {
            const { role, is_active } = req.body;
            const targetId = Number(req.params.id);
            const isSelf = targetId === req.user.id;

            // Prevent a super admin from locking themselves (and possibly everyone) out.
            if (isSelf && ((role !== undefined && role !== req.user.role) || is_active === false || is_active === 0)) {
                return res.status(400).json({ message: 'You cannot change your own role or deactivate your own account.' });
            }

            const updates = [];
            const values = [];

            if (role !== undefined) {
                const [roles] = await db.execute('SELECT id FROM roles WHERE name = ?', [role]);
                if (roles.length === 0) return res.status(400).json({ message: 'Unknown role' });
                updates.push('role_id = ?');
                values.push(roles[0].id);
            }
            if (is_active !== undefined) {
                if (![true, false, 0, 1].includes(is_active)) {
                    return res.status(400).json({ message: 'is_active must be true or false' });
                }
                updates.push('is_active = ?');
                values.push(is_active ? 1 : 0);
            }

            if (updates.length > 0) {
                values.push(targetId);
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
            if (Number(req.params.id) === req.user.id) {
                return res.status(400).json({ message: 'You cannot delete your own account.' });
            }
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
            if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
                return res.status(400).json({ message: 'Preferences must be an object' });
            }
            // Merge with what is stored, so one screen saving its settings (e.g. the
            // theme) never wipes another's (e.g. guided-tour progress).
            const [rows] = await db.execute('SELECT preferences FROM users WHERE id = ?', [req.user.id]);
            let current = {};
            try {
                const stored = rows[0]?.preferences;
                current = (typeof stored === 'string' ? JSON.parse(stored) : stored) || {};
            } catch { current = {}; }
            const merged = { ...current, ...req.body };
            const preferencesString = JSON.stringify(merged);
            if (preferencesString.length > 10000) {
                return res.status(400).json({ message: 'Preferences are too large' });
            }
            await db.execute('UPDATE users SET preferences = ? WHERE id = ?', [preferencesString, req.user.id]);
            res.json({ message: 'Preferences updated successfully', preferences: merged });
        } catch (error) {
            console.error('Error updating preferences:', error);
            res.status(500).json({ message: 'Failed to update preferences' });
        }
    }

    static async updatePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const passwordError = validatePassword(newPassword);
            if (passwordError) return res.status(400).json({ message: passwordError });
            if (typeof currentPassword !== 'string') {
                return res.status(400).json({ message: 'Incorrect current password' });
            }

            const [rows] = await db.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
            if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

            if (!(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
                return res.status(400).json({ message: 'Incorrect current password' });
            }
            if (currentPassword === newPassword) {
                return res.status(400).json({ message: 'Choose a password different from the current one.' });
            }

            await db.execute(
                'UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?',
                [await hashPassword(newPassword), req.user.id]
            );
            res.json({ message: 'Password updated successfully' });
        } catch (error) {
            console.error('Error updating password:', error);
            res.status(500).json({ message: 'Failed to update password' });
        }
    }
}

module.exports = UserController;
