const express = require('express');
const ProgramsController = require('./programs.controller');
const { authenticateToken } = require('../../core/middlewares/auth.middleware');

const router = express.Router();

router.use(authenticateToken);
router.get('/', ProgramsController.getAll);
router.post('/', ProgramsController.create);
router.delete('/:id', ProgramsController.delete);

module.exports = router;
