const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const { handle } = require('../scheduler/scheduler.controller');
const service = require('./results.service');

const router = express.Router();
// A student's own results only; leaders see analytics, never named results.
router.use(authenticateToken, requirePermission('results.own'));

router.get('/terms', handle(async (req, res) => {
    res.json(await service.termsForUser(req.user.id));
}));

router.get('/statement', handle(async (req, res) => {
    const termId = Number(req.query.term_id);
    if (!Number.isInteger(termId) || termId <= 0) return res.status(400).json({ message: 'Choose a term.' });
    try {
        res.json(await service.statementForUser(req.user.id, termId));
    } catch (error) {
        if (error.code === 'NOT_RELEASED') return res.status(403).json({ code: 'NOT_RELEASED', message: error.message });
        throw error;
    }
}));

module.exports = router;
