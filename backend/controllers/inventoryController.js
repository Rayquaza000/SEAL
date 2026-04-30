const { query } = require('../config/db');

// GET /api/workspaces/:workspaceId/inventory
const getInventory = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { search, lowStock } = req.query;

    let q = `SELECT * FROM inventory WHERE workspace_id = $1`;
    const params = [workspaceId];
    let idx = 2;

    if (search) {
      q += ` AND (LOWER(name) LIKE LOWER($${idx}) OR LOWER(supplier) LIKE LOWER($${idx}))`;
      params.push(`%${search}%`);
      idx++;
    }

    if (lowStock === 'true') {
      q += ` AND quantity <= min_threshold`;
    }

    q += ' ORDER BY name ASC';
    const result = await query(q, params);
    res.json({ inventory: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/workspaces/:workspaceId/inventory
const addItem = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, quantity, unit, minThreshold, supplier, unitPrice } = req.body;

    if (!name) return res.status(400).json({ message: 'Item name required' });

    const result = await query(
      `INSERT INTO inventory (workspace_id, name, quantity, unit, min_threshold, supplier, unit_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [workspaceId, name.trim(), quantity || 0, unit || null, minThreshold || 0, supplier || null, unitPrice || null]
    );

    res.status(201).json({ item: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/workspaces/:workspaceId/inventory/:itemId
const updateItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { name, quantity, unit, minThreshold, supplier, unitPrice } = req.body;

    const result = await query(
      `UPDATE inventory SET
        name = COALESCE($1, name),
        quantity = COALESCE($2, quantity),
        unit = COALESCE($3, unit),
        min_threshold = COALESCE($4, min_threshold),
        supplier = COALESCE($5, supplier),
        unit_price = COALESCE($6, unit_price),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name, quantity, unit, minThreshold, supplier, unitPrice, itemId]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/workspaces/:workspaceId/inventory/:itemId/adjust - add/remove stock
const adjustStock = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { adjustment, reason } = req.body; // positive = add, negative = remove

    const result = await query(
      `UPDATE inventory SET quantity = GREATEST(0, quantity + $1), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [adjustment, itemId]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'Item not found' });
    res.json({ item: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/workspaces/:workspaceId/inventory/:itemId
const deleteItem = async (req, res) => {
  try {
    await query('DELETE FROM inventory WHERE id = $1', [req.params.itemId]);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/workspaces/:workspaceId/inventory/summary
const getInventorySummary = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const result = await query(
      `SELECT 
        COUNT(*) AS total_items,
        COUNT(CASE WHEN quantity <= min_threshold THEN 1 END) AS low_stock_items,
        SUM(quantity * COALESCE(unit_price, 0)) AS total_value
       FROM inventory WHERE workspace_id = $1`,
      [workspaceId]
    );

    res.json({ summary: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getInventory, addItem, updateItem, adjustStock, deleteItem, getInventorySummary };
