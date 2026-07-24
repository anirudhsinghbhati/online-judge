const router = require('express').Router();

const asyncHandler = require('../utils/asyncHandler');
const adminController = require('../controllers/adminController');

router.get('/problems', asyncHandler(adminController.listProblems));
router.get('/problems/:id', asyncHandler(adminController.getProblem));
router.post('/problems', asyncHandler(adminController.createProblem));
router.put('/problems/:id', asyncHandler(adminController.updateProblem));
router.delete('/problems/:id', asyncHandler(adminController.deleteProblem));

router.get('/users', asyncHandler(adminController.listUsers));
router.get('/users/:id', asyncHandler(adminController.getUser));
router.post('/users', asyncHandler(adminController.createUser));
router.put('/users/:id', asyncHandler(adminController.updateUser));
router.patch('/users/:id/status', asyncHandler(adminController.setUserStatus));
router.delete('/users/:id', asyncHandler(adminController.deleteUser));

router.get('/contests', asyncHandler(adminController.listContests));
router.get('/contests/:id', asyncHandler(adminController.getContest));
router.post('/contests', asyncHandler(adminController.createContest));
router.put('/contests/:id', asyncHandler(adminController.updateContest));
router.patch('/contests/:id/status', asyncHandler(adminController.setContestStatus));
router.delete('/contests/:id', asyncHandler(adminController.deleteContest));

router.get('/groups', asyncHandler(adminController.listGroups));
router.get('/groups/:id', asyncHandler(adminController.getGroup));
router.post('/groups', asyncHandler(adminController.createGroup));
router.put('/groups/:id', asyncHandler(adminController.updateGroup));
router.delete('/groups/:id', asyncHandler(adminController.deleteGroup));

router.get('/logs', asyncHandler(adminController.listLogs));

router.get('/notices', asyncHandler(adminController.listNotices));
router.post('/notices', asyncHandler(adminController.createNotice));
router.delete('/notices/:id', asyncHandler(adminController.deleteNotice));

module.exports = router;