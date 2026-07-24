const router = require('express').Router();
const adminService = require('../services/adminService');
const asyncHandler = require('../utils/asyncHandler');
const { pool } = require('../database/connection');
const HttpError = require('../utils/httpError');

router.get('/', asyncHandler(async (req, res) => {
  const userId = req.query.userId ? Number.parseInt(req.query.userId, 10) : null;
  
  // Get user role
  let isStaff = false;
  if (userId) {
    const [userRows] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (userRows.length > 0 && (userRows[0].role === 'Admin' || userRows[0].role === 'Moderator')) {
      isStaff = true;
    }
  }

  const contests = await adminService.listContests(req.query.search || '');

  if (isStaff) {
    res.json({ success: true, data: contests });
    return;
  }

  // Filter for normal contestants:
  // Show Public contests, or Private contests if they are in one of the allowed groups
  let userGroupIds = [];
  if (userId) {
    const [memberRows] = await pool.query('SELECT group_id FROM group_members WHERE user_id = ?', [userId]);
    userGroupIds = memberRows.map(r => r.group_id);
  }

  // Fetch all contest group mappings
  const [contestGroupRows] = await pool.query('SELECT contest_id, group_id FROM contest_groups');
  const contestGroupsMap = {};
  contestGroupRows.forEach(row => {
    if (!contestGroupsMap[row.contest_id]) {
      contestGroupsMap[row.contest_id] = [];
    }
    contestGroupsMap[row.contest_id].push(row.group_id);
  });

  const accessibleContests = contests.filter((c) => {
    if (c.visibility === 'Public') {
      return true;
    }
    if (c.visibility === 'Private') {
      const allowedGroups = contestGroupsMap[c.id] || [];
      return allowedGroups.some(gId => userGroupIds.includes(gId));
    }
    return false;
  });

  res.json({ success: true, data: accessibleContests });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const userId = req.query.userId ? Number.parseInt(req.query.userId, 10) : null;
  const contest = await adminService.getContestById(req.params.id);

  // Check access if it's a private contest and user is not Admin/Moderator
  let isStaff = false;
  if (userId) {
    const [userRows] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (userRows.length > 0 && (userRows[0].role === 'Admin' || userRows[0].role === 'Moderator')) {
      isStaff = true;
    }
  }

  if (contest.visibility === 'Private' && !isStaff) {
    if (!userId) {
      throw new HttpError(403, 'Access denied: private contest');
    }
    const [memberRows] = await pool.query(
      'SELECT 1 FROM group_members gm INNER JOIN contest_groups cg ON gm.group_id = cg.group_id WHERE gm.user_id = ? AND cg.contest_id = ?',
      [userId, contest.id]
    );
    if (memberRows.length === 0) {
      throw new HttpError(403, 'Access denied: you are not in the allowed groups for this contest');
    }
  }

  // If the contest is upcoming, do not return problems list to contestants
  if (contest.status === 'Upcoming') {
    contest.problems = [];
  }

  res.json({ success: true, data: contest });
}));

module.exports = router;
