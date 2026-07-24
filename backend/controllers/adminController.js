const adminService = require('../services/adminService');

async function listUsers(req, res) {
  const users = await adminService.listUsers(req.query.search || '');
  res.json({ success: true, data: users });
}

async function getUser(req, res) {
  const user = await adminService.getUserById(req.params.id);
  res.json({ success: true, data: user });
}

async function createUser(req, res) {
  const user = await adminService.createUser(req.body || {});
  res.status(201).json({ success: true, data: user });
}

async function updateUser(req, res) {
  const user = await adminService.updateUser(req.params.id, req.body || {});
  res.json({ success: true, data: user });
}

async function setUserStatus(req, res) {
  const user = await adminService.setUserStatus(req.params.id, req.body?.status || 'Active');
  res.json({ success: true, data: user });
}

async function deleteUser(req, res) {
  await adminService.deleteUser(req.params.id);
  res.json({ success: true, message: 'User deleted successfully' });
}

async function listContests(req, res) {
  const contests = await adminService.listContests(req.query.search || '');
  res.json({ success: true, data: contests });
}

async function getContest(req, res) {
  const contest = await adminService.getContestById(req.params.id);
  res.json({ success: true, data: contest });
}

async function createContest(req, res) {
  const contest = await adminService.createContest(req.body || {});
  res.status(201).json({ success: true, data: contest });
}

async function updateContest(req, res) {
  const contest = await adminService.updateContest(req.params.id, req.body || {});
  res.json({ success: true, data: contest });
}

async function setContestStatus(req, res) {
  const contest = await adminService.setContestStatus(req.params.id, req.body?.status || 'Upcoming');
  res.json({ success: true, data: contest });
}

async function deleteContest(req, res) {
  await adminService.deleteContest(req.params.id);
  res.json({ success: true, message: 'Contest deleted successfully' });
}

async function listLogs(req, res) {
  const logs = await adminService.listLogs(req.query.limit ? Number(req.query.limit) : 100);
  res.json({ success: true, data: logs });
}

async function listProblems(req, res) {
  const problems = await adminService.listAdminProblems();
  res.json({ success: true, data: problems });
}

async function getProblem(req, res) {
  const problem = await adminService.getAdminProblemById(req.params.id);
  res.json({ success: true, data: problem });
}

async function createProblem(req, res) {
  const problem = await adminService.createAdminProblem(req.body || {});
  res.status(201).json({ success: true, data: problem });
}

async function updateProblem(req, res) {
  const problem = await adminService.updateAdminProblem(req.params.id, req.body || {});
  res.json({ success: true, data: problem });
}

async function deleteProblem(req, res) {
  await adminService.deleteAdminProblem(req.params.id);
  res.json({ success: true, message: 'Problem deleted successfully' });
}

async function listNotices(req, res) {
  const notices = await adminService.listNotices();
  res.json({ success: true, data: notices });
}

async function createNotice(req, res) {
  const notice = await adminService.createNotice(req.body || {});
  res.status(201).json({ success: true, data: notice });
}

async function deleteNotice(req, res) {
  await adminService.deleteNotice(req.params.id);
  res.json({ success: true, message: 'Notice deleted successfully' });
}

async function listGroups(req, res) {
  const groups = await adminService.listGroups(req.query.search || '');
  res.json({ success: true, data: groups });
}

async function getGroup(req, res) {
  const group = await adminService.getGroupById(req.params.id);
  res.json({ success: true, data: group });
}

async function createGroup(req, res) {
  const group = await adminService.createGroup(req.body || {});
  res.status(201).json({ success: true, data: group });
}

async function updateGroup(req, res) {
  const group = await adminService.updateGroup(req.params.id, req.body || {});
  res.json({ success: true, data: group });
}

async function deleteGroup(req, res) {
  await adminService.deleteGroup(req.params.id);
  res.json({ success: true, message: 'Group deleted successfully' });
}

module.exports = {
  createContest,
  createProblem,
  createUser,
  deleteContest,
  deleteProblem,
  deleteUser,
  getContest,
  getProblem,
  getUser,
  listContests,
  listLogs,
  listProblems,
  listUsers,
  setContestStatus,
  setUserStatus,
  updateContest,
  updateProblem,
  updateUser,
  listNotices,
  createNotice,
  deleteNotice,
  listGroups,
  getGroup,
  createGroup,
  updateGroup,
  deleteGroup
};