const { query } = require('../config/db');

// GET /api/workspaces/:workspaceId/employees
const getEmployees = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const result = await query(
      `SELECT u.id, u.name, u.email, u.avatar_url, wm.role, wm.joined_at,
        COUNT(DISTINCT CASE WHEN p.assigned_to = u.id THEN p.id END) AS products_assigned,
        COUNT(DISTINCT CASE WHEN ps.assigned_to = u.id THEN ps.id END) AS stages_assigned,
        COUNT(DISTINCT CASE WHEN ps.assigned_to = u.id AND ps.status = 'completed' THEN ps.id END) AS stages_completed
       FROM workspace_members wm
       JOIN users u ON u.id = wm.user_id
       LEFT JOIN products p ON p.workspace_id = $1 AND p.assigned_to = u.id
       LEFT JOIN product_stages ps ON ps.assigned_to = u.id AND ps.product_id IN (
         SELECT id FROM products WHERE workspace_id = $1
       )
       WHERE wm.workspace_id = $1
       GROUP BY u.id, wm.role, wm.joined_at
       ORDER BY wm.role ASC, u.name ASC`,
      [workspaceId]
    );

    res.json({ members: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/workspaces/:workspaceId/employees/:userId
const getEmployeeDetails = async (req, res) => {
  try {
    const { workspaceId, userId } = req.params;

    const member = await query(
      `SELECT u.id, u.name, u.email, u.avatar_url, wm.role, wm.joined_at
       FROM workspace_members wm JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = $1 AND wm.user_id = $2`,
      [workspaceId, userId]
    );
    if (member.rows.length === 0) return res.status(404).json({ message: 'Member not found' });

    const assignedProducts = await query(
      `SELECT p.id, p.name, p.product_code, p.status
       FROM products p WHERE p.workspace_id = $1 AND p.assigned_to = $2`,
      [workspaceId, userId]
    );

    const assignedStages = await query(
      `SELECT ps.id, ps.name, ps.status, p.name AS product_name, p.product_code
       FROM product_stages ps JOIN products p ON p.id = ps.product_id
       WHERE ps.assigned_to = $1 AND p.workspace_id = $2`,
      [userId, workspaceId]
    );

    res.json({
      member: member.rows[0],
      assignedProducts: assignedProducts.rows,
      assignedStages: assignedStages.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getEmployees, getEmployeeDetails };
