const { query, getClient } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');

// POST /api/workspaces - create new workspace (creator becomes owner)
const createWorkspace = async (req, res) => {
  const client = await getClient();
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Workspace name required' });

    await client.query('BEGIN');
    const ws = await client.query(
      'INSERT INTO workspaces (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    await client.query(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)',
      [ws.rows[0].id, req.user.id, 'owner']
    );
    await client.query('COMMIT');

    res.status(201).json({ workspace: { ...ws.rows[0], role: 'owner' } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// GET /api/workspaces/:workspaceId - workspace details + stats
const getWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const ws = await query('SELECT * FROM workspaces WHERE id = $1', [workspaceId]);
    if (ws.rows.length === 0) return res.status(404).json({ message: 'Workspace not found' });

    const stats = await query(
      `SELECT 
        COUNT(DISTINCT p.id) AS total_products,
        COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) AS completed_products,
        COUNT(DISTINCT CASE WHEN p.status != 'completed' THEN p.id END) AS pending_products,
        COUNT(DISTINCT wm.user_id) AS total_members,
        COUNT(DISTINCT CASE WHEN wm.role = 'employee' THEN wm.user_id END) AS employees,
        COUNT(DISTINCT CASE WHEN wm.role = 'owner' THEN wm.user_id END) AS owners
       FROM workspaces w
       LEFT JOIN products p ON p.workspace_id = w.id
       LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE w.id = $1`,
      [workspaceId]
    );

    // Recent products with progress
    const recent = await query(
      `SELECT p.id, p.name, p.product_code, p.status, p.concept_image_url,
        ROUND(
          100.0 * COUNT(CASE WHEN ps.status = 'completed' THEN 1 END) / NULLIF(COUNT(ps.id), 0)
        ) AS progress,
        ps2.name AS current_stage
       FROM products p
       LEFT JOIN product_stages ps ON ps.product_id = p.id
       LEFT JOIN product_stages ps2 ON ps2.id = (
         SELECT id FROM product_stages WHERE product_id = p.id AND status != 'completed' ORDER BY stage_order LIMIT 1
       )
       WHERE p.workspace_id = $1
       GROUP BY p.id, ps2.name
       ORDER BY p.created_at DESC
       LIMIT 10`,
      [workspaceId]
    );

    res.json({ workspace: ws.rows[0], stats: stats.rows[0], recentProducts: recent.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/workspaces/:workspaceId/invite - owner invites employee by email
const inviteEmployee = async (req, res) => {
  try {
    const { email } = req.body;
    const { workspaceId } = req.params;

    if (!email) return res.status(400).json({ message: 'Email required' });

    // Check if already a member
    const existing = await query(
      `SELECT u.id FROM users u JOIN workspace_members wm ON wm.user_id = u.id 
       WHERE u.email = $1 AND wm.workspace_id = $2`,
      [email.toLowerCase(), workspaceId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'User is already a member of this workspace' });
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await query(
      `INSERT INTO invitations (workspace_id, email, token, expires_at) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [workspaceId, email.toLowerCase(), token, expiresAt]
    );

    // Send email if SMTP configured
    if (process.env.SMTP_USER) {
      const ws = await query('SELECT name FROM workspaces WHERE id = $1', [workspaceId]);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      const inviteLink = `${process.env.FRONTEND_URL}/invite/${token}`;
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: `You've been invited to ${ws.rows[0]?.name} on SEAL`,
        html: `<p>You've been invited to join <b>${ws.rows[0]?.name}</b> on SEAL.</p>
               <p><a href="${inviteLink}">Click here to accept the invitation</a></p>
               <p>This link expires in 7 days.</p>`,
      });
    }

    res.json({ message: 'Invitation sent', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/workspaces/join-request - employee requests to join a workspace
const requestToJoin = async (req, res) => {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) return res.status(400).json({ message: 'Workspace ID required' });

    // Check if already a member
    const existing = await query(
      'SELECT id FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Already a member of this workspace' });
    }

    await query(
      `INSERT INTO join_requests (workspace_id, user_id) VALUES ($1, $2)
       ON CONFLICT (workspace_id, user_id) DO UPDATE SET status = 'pending'`,
      [workspaceId, req.user.id]
    );

    res.json({ message: 'Join request sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/workspaces/:workspaceId/join-requests - owners see pending requests
const getJoinRequests = async (req, res) => {
  try {
    const result = await query(
      `SELECT jr.id, jr.status, jr.created_at, u.id AS user_id, u.name, u.email, u.avatar_url
       FROM join_requests jr
       JOIN users u ON u.id = jr.user_id
       WHERE jr.workspace_id = $1 AND jr.status = 'pending'
       ORDER BY jr.created_at DESC`,
      [req.params.workspaceId]
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/workspaces/:workspaceId/join-requests/:requestId - approve/reject
const handleJoinRequest = async (req, res) => {
  const client = await getClient();
  try {
    const { action } = req.body; // 'approve' or 'reject'
    const { workspaceId, requestId } = req.params;

    await client.query('BEGIN');

    const req_ = await client.query(
      'SELECT * FROM join_requests WHERE id = $1 AND workspace_id = $2',
      [requestId, workspaceId]
    );
    if (req_.rows.length === 0) return res.status(404).json({ message: 'Request not found' });

    if (action === 'approve') {
      await client.query(
        'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [workspaceId, req_.rows[0].user_id, 'employee']
      );
    }

    await client.query(
      "UPDATE join_requests SET status = $1 WHERE id = $2",
      [action === 'approve' ? 'approved' : 'rejected', requestId]
    );

    await client.query('COMMIT');
    res.json({ message: `Request ${action}d` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// POST /api/workspaces/accept-invite/:token - accept invitation
const acceptInvite = async (req, res) => {
  const client = await getClient();
  try {
    const { token } = req.params;

    const inv = await client.query(
      `SELECT * FROM invitations WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`,
      [token]
    );
    if (inv.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired invitation' });
    }

    const invitation = inv.rows[0];

    // Verify the logged-in user email matches invitation email
    if (req.user.email !== invitation.email) {
      return res.status(403).json({ message: 'This invitation was sent to a different email address' });
    }

    await client.query('BEGIN');
    await client.query(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [invitation.workspace_id, req.user.id, 'employee']
    );
    await client.query("UPDATE invitations SET status = 'accepted' WHERE id = $1", [invitation.id]);
    await client.query('COMMIT');

    const ws = await query('SELECT * FROM workspaces WHERE id = $1', [invitation.workspace_id]);
    res.json({ message: 'Joined workspace', workspace: ws.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// GET /api/workspaces/search - search workspaces to request joining
const searchWorkspaces = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ workspaces: [] });

    const result = await query(
      `SELECT w.id, w.name, 
        COUNT(wm.id) AS member_count,
        EXISTS(SELECT 1 FROM workspace_members WHERE workspace_id = w.id AND user_id = $2) AS is_member,
        EXISTS(SELECT 1 FROM join_requests WHERE workspace_id = w.id AND user_id = $2 AND status = 'pending') AS request_pending
       FROM workspaces w
       LEFT JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE LOWER(w.name) LIKE LOWER($1)
       GROUP BY w.id
       LIMIT 20`,
      [`%${q}%`, req.user.id]
    );

    res.json({ workspaces: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/workspaces/:workspaceId/members/:userId - remove member
const removeMember = async (req, res) => {
  try {
    const { workspaceId, userId } = req.params;

    // Can't remove yourself if only owner
    const owners = await query(
      "SELECT COUNT(*) FROM workspace_members WHERE workspace_id = $1 AND role = 'owner'",
      [workspaceId]
    );
    if (parseInt(owners.rows[0].count) === 1 && parseInt(userId) === req.user.id) {
      return res.status(400).json({ message: 'Cannot remove the only owner' });
    }

    await query(
      'DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );

    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/workspaces/:workspaceId/members/:userId/role - promote/demote
const updateMemberRole = async (req, res) => {
  try {
    const { workspaceId, userId } = req.params;
    const { role } = req.body;

    if (!['owner', 'employee'].includes(role)) {
      return res.status(400).json({ message: 'Role must be owner or employee' });
    }

    await query(
      'UPDATE workspace_members SET role = $1 WHERE workspace_id = $2 AND user_id = $3',
      [role, workspaceId, userId]
    );

    res.json({ message: 'Role updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createWorkspace,
  getWorkspace,
  inviteEmployee,
  requestToJoin,
  getJoinRequests,
  handleJoinRequest,
  acceptInvite,
  searchWorkspaces,
  removeMember,
  updateMemberRole,
};
