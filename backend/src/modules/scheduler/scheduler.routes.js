const express = require('express');
const { authenticateToken, requirePermission } = require('../../core/middlewares/auth.middleware');
const { SchedulerController } = require('./scheduler.controller');

const router = express.Router();
router.use(authenticateToken, requirePermission('timetable.generate'));

router.get('/setup', SchedulerController.setup);
router.put('/bell', SchedulerController.saveBell);
router.post('/streams', SchedulerController.createStream);
router.delete('/streams/:id', SchedulerController.deleteStream);
router.put('/classes/:id/stream', SchedulerController.setClassStream);
router.put('/subjects/:id', SchedulerController.setSubjectHeavy);
router.put('/teachers/:id', SchedulerController.saveTeacher);
router.put('/allocations/:groupId', SchedulerController.saveAllocations);
router.post('/allocations/copy', SchedulerController.copyAllocations);
router.post('/generate', SchedulerController.generate);
router.get('/runs', SchedulerController.listRuns);
router.get('/runs/:id', SchedulerController.getRun);
router.post('/runs/:id/publish', SchedulerController.publish);

module.exports = router;
