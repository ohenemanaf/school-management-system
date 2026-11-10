const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const { handle } = require('./scheduler.controller');
const { runMorningJobs } = require('../../jobs/reminders');

const router = express.Router();
router.use(authenticateToken, requirePermission('reminders.run'));

// Preview or send this morning's reminders now (normally sent automatically at 07:00).
router.post('/run', handle(async (req, res) => {
    const { preview, date } = req.body;
    if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
        return res.status(400).json({ message: 'Date must be YYYY-MM-DD.' });
    }
    res.json(await runMorningJobs({ preview: Boolean(preview), ...(date ? { date } : {}) }));
}));

module.exports = router;
