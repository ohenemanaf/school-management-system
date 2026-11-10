const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const { TermsController } = require('./terms.controller');

const router = express.Router();
router.use(authenticateToken);

router.get('/', requirePermission('terms.view'), TermsController.list);
router.get('/current', requirePermission('terms.view'), TermsController.current);
router.post('/', requirePermission('terms.manage'), TermsController.create);
router.put('/exams/:examId', requirePermission('terms.manage'), TermsController.updateExam);
router.delete('/exams/:examId', requirePermission('terms.manage'), TermsController.removeExam);
router.put('/:id', requirePermission('terms.manage'), TermsController.update);
router.post('/:id/current', requirePermission('terms.manage'), TermsController.makeCurrent);
router.delete('/:id', requirePermission('terms.manage'), TermsController.remove);
router.post('/:id/exams', requirePermission('terms.manage'), TermsController.addExam);

module.exports = router;
