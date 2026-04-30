const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

// Verify JWT and attach user to req
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query('SELECT id, name, email, avatar_url FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Verify user is an owner of the given workspace (workspaceId from req.params or req.body)
const requireOwner = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
    if (!workspaceId) return res.status(400).json({ message: 'Workspace ID required' });

    const result = await query(
      `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, req.user.id]
    );

    if (result.rows.length === 0 || result.rows[0].role !== 'owner') {
      return res.status(403).json({ message: 'Owner access required' });
    }

    req.workspaceRole = 'owner';
    req.workspaceId = parseInt(workspaceId);
    next();
  } catch (err) {
    next(err);
  }
};

// Verify user is a member (owner or employee) of the workspace
const requireMember = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
    if (!workspaceId) return res.status(400).json({ message: 'Workspace ID required' });

    const result = await query(
      `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [workspaceId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'Workspace access required' });
    }

    req.workspaceRole = result.rows[0].role;
    req.workspaceId = parseInt(workspaceId);
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, requireOwner, requireMember };
