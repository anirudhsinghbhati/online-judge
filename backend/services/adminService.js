const crypto = require('crypto');

const { pool } = require('../database/connection');
const HttpError = require('../utils/httpError');
const { recordLog, listLogs } = require('./adminLogService');
const problemService = require('./problemService');
const cache = require('../utils/cache');

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePositiveId(value, label) {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, `Invalid ${label}`);
  }
  return id;
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function normalizeUserPayload(payload) {
  const name = normalizeText(payload.name);
  const email = normalizeText(payload.email).toLowerCase();
  const role = normalizeText(payload.role) || 'Contestant';
  const password = normalizeText(payload.password);
  const validTill = normalizeText(payload.validTill || payload.valid_till) || null;

  if (!name) {
    throw new HttpError(400, 'Name is required');
  }

  if (!email) {
    throw new HttpError(400, 'Email is required');
  }

  return {
    name,
    email,
    role,
    password,
    validTill
  };
}

async function listUsers(search = '') {
  const term = normalizeText(search);
  const params = [];
  let sql = 'SELECT id, name, email, role, valid_till, status, submissions_count, acceptance_rate, contests_count, last_activity, created_at, updated_at FROM users';

  if (term) {
    sql += ' WHERE name LIKE ? OR email LIKE ? OR role LIKE ?';
    params.push(`%${term}%`, `%${term}%`, `%${term}%`);
  }

  sql += ' ORDER BY id DESC';

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function getUserById(id) {
  const userId = parsePositiveId(id, 'user id');
  const [rows] = await pool.query(
    'SELECT id, name, email, role, valid_till, status, submissions_count, acceptance_rate, contests_count, last_activity, created_at, updated_at FROM users WHERE id = ?',
    [userId]
  );

  if (rows.length === 0) {
    throw new HttpError(404, 'User not found');
  }

  const user = rows[0];

  return {
    ...user,
    analytics: {
      submissions: user.submissions_count,
      acceptanceRate: Number(user.acceptance_rate),
      contests: user.contests_count,
      lastActivity: user.last_activity
    }
  };
}

async function createUser(payload) {
  const { name, email, role, password, validTill } = normalizeUserPayload(payload);
  const passwordToStore = password ? hashPassword(password) : hashPassword('change-me');

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    throw new HttpError(409, 'Email already exists');
  }

  const [result] = await pool.query(
    'INSERT INTO users (name, email, role, password_hash, valid_till, status) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, role, passwordToStore, validTill, 'Active']
  );

  await recordLog('User', `Created user #${result.insertId} (${email})`, 'Info');

  return getUserById(result.insertId);
}

async function updateUser(id, payload) {
  const userId = parsePositiveId(id, 'user id');
  const existing = await getUserById(userId);
  const nextName = normalizeText(payload.name) || existing.name;
  const nextEmail = normalizeText(payload.email).toLowerCase() || existing.email;
  const nextRole = normalizeText(payload.role) || existing.role;
  const nextValidTill = normalizeText(payload.validTill || payload.valid_till) || existing.valid_till;
  const nextStatus = normalizeText(payload.status) || existing.status;

  const password = normalizeText(payload.password);
  const passwordHash = password ? hashPassword(password) : undefined;

  if (nextEmail !== existing.email) {
    const [emailRows] = await pool.query('SELECT id FROM users WHERE email = ? AND id <> ?', [nextEmail, userId]);
    if (emailRows.length > 0) {
      throw new HttpError(409, 'Email already exists');
    }
  }

  const fields = ['name = ?', 'email = ?', 'role = ?', 'valid_till = ?', 'status = ?'];
  const values = [nextName, nextEmail, nextRole, nextValidTill, nextStatus];

  if (passwordHash) {
    fields.push('password_hash = ?');
    values.push(passwordHash);
  }

  values.push(userId);

  const [result] = await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  if (result.affectedRows === 0) {
    throw new HttpError(404, 'User not found');
  }

  await recordLog('User', `Updated user #${userId} (${nextEmail})`, 'Info');

  return getUserById(userId);
}

async function setUserStatus(id, status) {
  const userId = parsePositiveId(id, 'user id');
  const nextStatus = normalizeText(status) || 'Active';

  const [result] = await pool.query('UPDATE users SET status = ? WHERE id = ?', [nextStatus, userId]);
  if (result.affectedRows === 0) {
    throw new HttpError(404, 'User not found');
  }

  await recordLog('User', `Set user #${userId} status to ${nextStatus}`, 'Warning');

  return getUserById(userId);
}

async function deleteUser(id) {
  const userId = parsePositiveId(id, 'user id');
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId]);
  if (result.affectedRows === 0) {
    throw new HttpError(404, 'User not found');
  }

  await recordLog('User', `Deleted user #${userId}`, 'Warning');
  return { deleted: true };
}

function normalizeContestPayload(payload) {
  const contestName = normalizeText(payload.contestName || payload.name);
  const contestCode = normalizeText(payload.contestCode || payload.code);
  const description = normalizeText(payload.description);
  const startDate = normalizeText(payload.startDate || payload.start_date);
  const startTime = normalizeText(payload.startTime || payload.start_time);
  const endDate = normalizeText(payload.endDate || payload.end_date);
  const endTime = normalizeText(payload.endTime || payload.end_time);
  const duration = normalizeText(payload.duration);
  const visibility = normalizeText(payload.visibility) || 'Public';
  const accessControl = normalizeText(payload.accessControl || payload.access_control) || 'Allowed Users';
  const allowedUsers = normalizeText(payload.allowedUsers || payload.allowed_users);
  const status = normalizeText(payload.status) || 'Upcoming';
  const problemIds = Array.isArray(payload.problemIds) ? payload.problemIds.map((value) => Number.parseInt(value, 10)).filter((value) => Number.isInteger(value) && value > 0) : [];
  const groupIds = Array.isArray(payload.groupIds) ? payload.groupIds.map((value) => Number.parseInt(value, 10)).filter((value) => Number.isInteger(value) && value > 0) : [];

  if (!contestName) {
    throw new HttpError(400, 'Contest name is required');
  }

  if (!contestCode) {
    throw new HttpError(400, 'Contest code is required');
  }

  if (!startDate || !startTime || !endDate || !endTime) {
    throw new HttpError(400, 'Contest start and end dates are required');
  }

  if (!duration) {
    throw new HttpError(400, 'Duration is required');
  }

  return {
    contestName,
    contestCode,
    description,
    startDate,
    startTime,
    endDate,
    endTime,
    duration,
    visibility,
    accessControl,
    allowedUsers,
    status,
    problemIds,
    groupIds
  };

}

function formatDateString(d) {
  if (d instanceof Date) {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(d || '');
}

function computeContestStatus(contest) {
  if (contest.status === 'Canceled') {
    return 'Canceled';
  }

  const startStr = formatDateString(contest.start_date || contest.startDate);
  const endStr = formatDateString(contest.end_date || contest.endDate);
  const startTime = contest.start_time || contest.startTime;
  const endTime = contest.end_time || contest.endTime;

  const startObj = new Date(`${startStr}T${startTime}Z`);
  const endObj = new Date(`${endStr}T${endTime}Z`);
  const now = new Date();

  if (now < startObj) {
    return 'Upcoming';
  } else if (now >= startObj && now <= endObj) {
    return 'Active';
  } else {
    return 'Completed';
  }
}


async function listContests(search = '') {
  const term = normalizeText(search);

  const allContests = await cache.cacheOrFetch('contests:list', 300, async () => {
    const sql = 'SELECT id, contest_name, contest_code, description, start_date, start_time, end_date, end_time, duration, visibility, access_control, allowed_users, status, created_at, updated_at FROM contests ORDER BY start_date DESC, start_time DESC, id DESC';
    const [rows] = await pool.query(sql);
    return rows.map((row) => ({
      ...row,
      status: computeContestStatus(row)
    }));
  });

  if (term) {
    const termLower = term.toLowerCase();
    return allContests.filter((c) =>
      c.contest_name.toLowerCase().includes(termLower) ||
      c.contest_code.toLowerCase().includes(termLower) ||
      c.status.toLowerCase().includes(termLower)
    );
  }

  return allContests;
}

async function getContestById(id) {
  const contestId = parsePositiveId(id, 'contest id');
  const cacheKey = `contest:${contestId}`;

  return cache.cacheOrFetch(cacheKey, 300, async () => {
    const [rows] = await pool.query(
      'SELECT id, contest_name, contest_code, description, start_date, start_time, end_date, end_time, duration, visibility, access_control, allowed_users, status, created_at, updated_at FROM contests WHERE id = ?',
      [contestId]
    );

    if (rows.length === 0) {
      throw new HttpError(404, 'Contest not found');
    }

    const contest = rows[0];
    contest.status = computeContestStatus(contest);

    const [problemRows] = await pool.query(
      'SELECT p.id, p.title FROM contest_problems cp INNER JOIN problems p ON p.id = cp.problem_id WHERE cp.contest_id = ? ORDER BY cp.id ASC',
      [contestId]
    );

    const [participantRows] = await pool.query(
      'SELECT u.id, u.name, u.email FROM contest_participants cp INNER JOIN users u ON u.id = cp.user_id WHERE cp.contest_id = ? ORDER BY cp.id ASC',
      [contestId]
    );

    const [groupRows] = await pool.query(
      'SELECT ug.id, ug.name FROM contest_groups cg INNER JOIN user_groups ug ON ug.id = cg.group_id WHERE cg.contest_id = ?',
      [contestId]
    );

    return {
      ...contest,
      problems: problemRows,
      participants: participantRows,
      groupIds: groupRows.map((g) => g.id),
      groups: groupRows,
      leaderboard: participantRows.map((participant, index) => ({
        rank: index + 1,
        name: participant.name,
        score: Math.max(0, 1000 - index * 80)
      }))
    };

  });
}

async function createContest(payload) {
  const contest = normalizeContestPayload(payload);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO contests (contest_name, contest_code, description, start_date, start_time, end_date, end_time, duration, visibility, access_control, allowed_users, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [contest.contestName, contest.contestCode, contest.description, contest.startDate, contest.startTime, contest.endDate, contest.endTime, contest.duration, contest.visibility, contest.accessControl, contest.allowedUsers, contest.status]
    );

    for (const problemId of contest.problemIds) {
      await connection.query(
        'INSERT INTO contest_problems (contest_id, problem_id, source) VALUES (?, ?, ?)',
        [result.insertId, problemId, 'existing']
      );
    }

    for (const groupId of contest.groupIds) {
      await connection.query(
        'INSERT INTO contest_groups (contest_id, group_id) VALUES (?, ?)',
        [result.insertId, groupId]
      );
    }

    await recordLog('Contest', `Created contest #${result.insertId} (${contest.contestName})`, 'Info', connection);

    await connection.commit();

    // Invalidate caches
    await cache.del('contests:list');

    return getContestById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateContest(id, payload) {
  const contestId = parsePositiveId(id, 'contest id');
  const contest = normalizeContestPayload(payload);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      'UPDATE contests SET contest_name = ?, contest_code = ?, description = ?, start_date = ?, start_time = ?, end_date = ?, end_time = ?, duration = ?, visibility = ?, access_control = ?, allowed_users = ?, status = ? WHERE id = ?',
      [contest.contestName, contest.contestCode, contest.description, contest.startDate, contest.startTime, contest.endDate, contest.endTime, contest.duration, contest.visibility, contest.accessControl, contest.allowedUsers, contest.status, contestId]
    );

    if (result.affectedRows === 0) {
      throw new HttpError(404, 'Contest not found');
    }

    await connection.query('DELETE FROM contest_problems WHERE contest_id = ?', [contestId]);

    for (const problemId of contest.problemIds) {
      await connection.query(
        'INSERT INTO contest_problems (contest_id, problem_id, source) VALUES (?, ?, ?)',
        [contestId, problemId, 'existing']
      );
    }

    await connection.query('DELETE FROM contest_groups WHERE contest_id = ?', [contestId]);

    for (const groupId of contest.groupIds) {
      await connection.query(
        'INSERT INTO contest_groups (contest_id, group_id) VALUES (?, ?)',
        [contestId, groupId]
      );
    }

    await recordLog('Contest', `Updated contest #${contestId} (${contest.contestName})`, 'Info', connection);

    await connection.commit();

    // Invalidate caches
    await cache.del('contests:list');
    await cache.del(`contest:${contestId}`);

    return getContestById(contestId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}


async function setContestStatus(id, status) {
  const contestId = parsePositiveId(id, 'contest id');
  const nextStatus = normalizeText(status) || 'Upcoming';

  const [result] = await pool.query('UPDATE contests SET status = ? WHERE id = ?', [nextStatus, contestId]);
  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Contest not found');
  }

  await recordLog('Contest', `Set contest #${contestId} status to ${nextStatus}`, 'Warning');

  // Invalidate caches
  await cache.del('contests:list');
  await cache.del(`contest:${contestId}`);

  return getContestById(contestId);
}

async function deleteContest(id) {
  const contestId = parsePositiveId(id, 'contest id');
  const [result] = await pool.query('DELETE FROM contests WHERE id = ?', [contestId]);
  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Contest not found');
  }
  await recordLog('Contest', `Deleted contest #${contestId}`, 'Warning');

  // Invalidate caches
  await cache.del('contests:list');
  await cache.del(`contest:${contestId}`);

  return { deleted: true };
}

async function listNotices() {
  return cache.cacheOrFetch('notices:list', 300, async () => {
    const [rows] = await pool.query('SELECT id, title, content, created_at FROM notices ORDER BY id DESC');
    return rows;
  });
}

async function createNotice(payload) {
  const title = normalizeText(payload.title);
  const content = normalizeText(payload.content);

  if (!title) {
    throw new HttpError(400, 'Title is required');
  }
  if (!content) {
    throw new HttpError(400, 'Content is required');
  }

  const [result] = await pool.query('INSERT INTO notices (title, content) VALUES (?, ?)', [title, content]);
  
  await recordLog('Notice', `Created notice #${result.insertId} (${title})`, 'Info');

  // Invalidate caches
  await cache.del('notices:list');

  return { id: result.insertId, title, content };
}

async function deleteNotice(id) {
  const noticeId = parsePositiveId(id, 'notice id');
  const [result] = await pool.query('DELETE FROM notices WHERE id = ?', [noticeId]);
  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Notice not found');
  }

  await recordLog('Notice', `Deleted notice #${noticeId}`, 'Warning');

  // Invalidate caches
  await cache.del('notices:list');

  return { deleted: true };
}

async function listAdminProblems() {
  return problemService.getAllProblems();
}

async function getAdminProblemById(id) {
  return problemService.getProblemById(id, undefined, { includeHidden: true });
}

async function createAdminProblem(payload) {
  return problemService.createProblem(payload);
}

async function updateAdminProblem(id, payload) {
  return problemService.updateProblem(id, payload);
}

async function deleteAdminProblem(id) {
  return problemService.deleteProblem(id);
}

async function listGroups(search = '') {
  const term = normalizeText(search);
  const params = [];
  let sql = `
    SELECT ug.id, ug.name, ug.description, ug.created_at, COUNT(gm.user_id) AS member_count
    FROM user_groups ug
    LEFT JOIN group_members gm ON ug.id = gm.group_id
  `;
  if (term) {
    sql += ' WHERE ug.name LIKE ? OR ug.description LIKE ?';
    params.push(`%${term}%`, `%${term}%`);
  }
  sql += ' GROUP BY ug.id ORDER BY ug.id DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function getGroupById(id) {
  const groupId = parsePositiveId(id, 'group id');
  const [rows] = await pool.query(
    'SELECT id, name, description, created_at FROM user_groups WHERE id = ?',
    [groupId]
  );
  if (rows.length === 0) {
    throw new HttpError(404, 'Group not found');
  }
  const group = rows[0];

  const [memberRows] = await pool.query(
    'SELECT u.id, u.name, u.email FROM group_members gm INNER JOIN users u ON u.id = gm.user_id WHERE gm.group_id = ? ORDER BY u.name ASC',
    [groupId]
  );

  return {
    ...group,
    userIds: memberRows.map((u) => u.id),
    members: memberRows
  };
}

async function createGroup(payload) {
  const name = normalizeText(payload.name);
  const description = normalizeText(payload.description);
  const userIds = Array.isArray(payload.userIds) ? payload.userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0) : [];

  if (!name) {
    throw new HttpError(400, 'Group name is required');
  }

  const [existing] = await pool.query('SELECT id FROM user_groups WHERE name = ?', [name]);
  if (existing.length > 0) {
    throw new HttpError(409, 'Group name already exists');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO user_groups (name, description) VALUES (?, ?)',
      [name, description]
    );

    const groupId = result.insertId;

    for (const userId of userIds) {
      await connection.query(
        'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
        [groupId, userId]
      );
    }

    await recordLog('Group', `Created group #${groupId} (${name})`, 'Info', connection);
    await connection.commit();

    return getGroupById(groupId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateGroup(id, payload) {
  const groupId = parsePositiveId(id, 'group id');
  const name = normalizeText(payload.name);
  const description = normalizeText(payload.description);
  const userIds = Array.isArray(payload.userIds) ? payload.userIds.map((userId) => Number(userId)).filter((userId) => Number.isInteger(userId) && userId > 0) : [];

  if (!name) {
    throw new HttpError(400, 'Group name is required');
  }

  const [existing] = await pool.query('SELECT id FROM user_groups WHERE name = ? AND id <> ?', [name, groupId]);
  if (existing.length > 0) {
    throw new HttpError(409, 'Group name already exists');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      'UPDATE user_groups SET name = ?, description = ? WHERE id = ?',
      [name, description, groupId]
    );

    if (result.affectedRows === 0) {
      throw new HttpError(404, 'Group not found');
    }

    await connection.query('DELETE FROM group_members WHERE group_id = ?', [groupId]);

    for (const userId of userIds) {
      await connection.query(
        'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
        [groupId, userId]
      );
    }

    await recordLog('Group', `Updated group #${groupId} (${name})`, 'Info', connection);
    await connection.commit();

    return getGroupById(groupId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteGroup(id) {
  const groupId = parsePositiveId(id, 'group id');
  const [result] = await pool.query('DELETE FROM user_groups WHERE id = ?', [groupId]);
  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Group not found');
  }

  await recordLog('Group', `Deleted group #${groupId}`, 'Warning');
  return { deleted: true };
}

module.exports = {
  createAdminProblem,
  createContest,
  createUser,
  deleteAdminProblem,
  deleteContest,
  deleteUser,
  getAdminProblemById,
  getContestById,
  getUserById,
  listAdminProblems,
  listContests,
  listLogs,
  listUsers,
  setContestStatus,
  setUserStatus,
  updateAdminProblem,
  updateContest,
  updateUser,
  listNotices,
  createNotice,
  deleteNotice,
  listGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup
};