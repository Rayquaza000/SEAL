const { query } = require('../config/db');

// PUT /api/workspaces/:workspaceId/stages/:stageId/status
const updateStageStatus = async (req, res) => {
  try {
    const { stageId, workspaceId } = req.params;
    const { status, notes } = req.body;
    const isOwner = req.workspaceRole === 'owner';

    if (!['pending', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Check permissions: owner can update any stage, employee only their own
    const stage = await query(
      `SELECT ps.*, p.workspace_id FROM product_stages ps 
       JOIN products p ON p.id = ps.product_id WHERE ps.id = $1`,
      [stageId]
    );

    if (stage.rows.length === 0) return res.status(404).json({ message: 'Stage not found' });
    if (stage.rows[0].workspace_id !== parseInt(workspaceId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (!isOwner && stage.rows[0].assigned_to !== req.user.id) {
      return res.status(403).json({ message: 'You can only update stages assigned to you' });
    }

    const result = await query(
      `UPDATE product_stages SET status = $1, notes = COALESCE($2, notes), updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [status, notes || null, stageId]
    );

    // Update product overall status
    const allStages = await query(
      'SELECT status FROM product_stages WHERE product_id = $1',
      [stage.rows[0].product_id]
    );
    
    const statuses = allStages.rows.map((s) => s.status);
    let productStatus = 'pending';
    if (statuses.every((s) => s === 'completed')) {
      productStatus = 'completed';
    } else if (statuses.some((s) => s === 'in_progress' || s === 'completed')) {
      productStatus = 'in_progress';
    }

    await query('UPDATE products SET status = $1 WHERE id = $2', [productStatus, stage.rows[0].product_id]);

    res.json({ stage: result.rows[0], productStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/workspaces/:workspaceId/stages/:stageId/assign
const assignStage = async (req, res) => {
  try {
    const { stageId } = req.params;
    const { assignedTo } = req.body;

    const result = await query(
      'UPDATE product_stages SET assigned_to = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [assignedTo || null, stageId]
    );

    res.json({ stage: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/workspaces/:workspaceId/my-tasks - employee's assigned tasks
const getMyTasks = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const result = await query(
      `SELECT ps.id, ps.name AS stage_name, ps.status, ps.stage_order, ps.notes,
              p.id AS product_id, p.name AS product_name, p.product_code, p.concept_image_url,
              'stage' AS task_type
       FROM product_stages ps
       JOIN products p ON p.id = ps.product_id
       WHERE ps.assigned_to = $1 AND p.workspace_id = $2
       UNION ALL
       SELECT p.id, 'Overall Product' AS stage_name, p.status, 0, p.notes,
              p.id AS product_id, p.name AS product_name, p.product_code, p.concept_image_url,
              'product' AS task_type
       FROM products p
       WHERE p.assigned_to = $1 AND p.workspace_id = $2
       ORDER BY product_id, stage_order`,
      [req.user.id, workspaceId]
    );

    res.json({ tasks: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/workspaces/:workspaceId/products/:productId/stages - add stage
const addStage = async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, assignedTo } = req.body;

    if (!name) return res.status(400).json({ message: 'Stage name required' });

    const maxOrder = await query(
      'SELECT COALESCE(MAX(stage_order), 0) AS max_order FROM product_stages WHERE product_id = $1',
      [productId]
    );

    const result = await query(
      `INSERT INTO product_stages (product_id, name, stage_order, assigned_to)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [productId, name, maxOrder.rows[0].max_order + 1, assignedTo || null]
    );

    res.status(201).json({ stage: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/workspaces/:workspaceId/stages/:stageId
const deleteStage = async (req, res) => {
  try {
    await query('DELETE FROM product_stages WHERE id = $1', [req.params.stageId]);
    res.json({ message: 'Stage deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { updateStageStatus, assignStage, getMyTasks, addStage, deleteStage };
