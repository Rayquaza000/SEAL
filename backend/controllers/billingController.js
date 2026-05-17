const { query, getClient } = require('../config/db');

// GET /api/workspaces/:workspaceId/bills
const getBills = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { status, client: clientName } = req.query;

    let q = `
      SELECT b.*, p.name AS product_name, p.product_code,
             COUNT(bi.id) AS item_count,
             COALESCE(b.amount_paid, 0) AS amount_paid
      FROM bills b
      LEFT JOIN products p ON p.id = b.product_id
      LEFT JOIN bill_items bi ON bi.bill_id = b.id
      WHERE b.workspace_id = $1
    `;
    const params = [workspaceId];
    let idx = 2;

    if (status) { q += ` AND b.status = $${idx++}`; params.push(status); }
    if (clientName) { q += ` AND LOWER(b.client) LIKE LOWER($${idx++})`; params.push(`%${clientName}%`); }

    q += ' GROUP BY b.id, p.name, p.product_code ORDER BY b.created_at DESC';

    const result = await query(q, params);
    res.json({ bills: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/workspaces/:workspaceId/bills/:billId
const getBill = async (req, res) => {
  try {
    const { billId } = req.params;

    const bill = await query(
      `SELECT b.*, p.name AS product_name, p.product_code
       FROM bills b LEFT JOIN products p ON p.id = b.product_id
       WHERE b.id = $1`,
      [billId]
    );
    if (bill.rows.length === 0) return res.status(404).json({ message: 'Bill not found' });

    const items = await query('SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY id', [billId]);

    res.json({ bill: bill.rows[0], items: items.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/workspaces/:workspaceId/bills
const createBill = async (req, res) => {
  const client = await getClient();
  try {
    const { workspaceId } = req.params;
    const { productId, clientName, items, dueDate, notes } = req.body;

    if (!clientName) return res.status(400).json({ message: 'Client name required' });

    const itemsArr = typeof items === 'string' ? JSON.parse(items) : items || [];

    // Auto-generate bill number
    const count = await query('SELECT COUNT(*) FROM bills WHERE workspace_id = $1', [workspaceId]);
    const billNumber = `BILL-${String(parseInt(count.rows[0].count) + 1).padStart(4, '0')}`;

    const totalAmount = itemsArr.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    await client.query('BEGIN');

    const bill = await client.query(
      `INSERT INTO bills (workspace_id, product_id, bill_number, client, total_amount, due_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [workspaceId, productId || null, billNumber, clientName, totalAmount, dueDate || null, notes || null]
    );

    const billId = bill.rows[0].id;

    for (const item of itemsArr) {
      await client.query(
        `INSERT INTO bill_items (bill_id, description, quantity, unit_price, total)
         VALUES ($1, $2, $3, $4, $5)`,
        [billId, item.description, item.quantity, item.unitPrice, item.quantity * item.unitPrice]
      );
    }

    await client.query('COMMIT');

    const fullBill = await query('SELECT * FROM bills WHERE id = $1', [billId]);
    const fullItems = await query('SELECT * FROM bill_items WHERE bill_id = $1', [billId]);

    res.status(201).json({ bill: fullBill.rows[0], items: fullItems.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// PUT /api/workspaces/:workspaceId/bills/:billId
const updateBill = async (req, res) => {
  const client = await getClient();
  try {
    const { billId } = req.params;
    const { clientName, productId, items, dueDate, notes, status, amountPaid } = req.body;

    await client.query('BEGIN');

    const setClauses = [];
    const params = [];
    let idx = 1;

    if (clientName !== undefined) { setClauses.push(`client = $${idx++}`);     params.push(clientName || null); }
    if (productId !== undefined)  { setClauses.push(`product_id = $${idx++}`); params.push(productId || null); }
    if (dueDate !== undefined)    { setClauses.push(`due_date = $${idx++}`);   params.push(dueDate || null); }
    if (notes !== undefined)      { setClauses.push(`notes = $${idx++}`);      params.push(notes || null); }
    if (status)                   { setClauses.push(`status = $${idx++}`);     params.push(status); }
    // Track partial / full payments from lumpsum
    if (amountPaid !== undefined) { setClauses.push(`amount_paid = $${idx++}`); params.push(parseFloat(amountPaid) || 0); }

    if (items !== undefined && items !== null) {
      const itemsArr = typeof items === 'string' ? JSON.parse(items) : items;
      await client.query('DELETE FROM bill_items WHERE bill_id = $1', [billId]);

      let totalAmount = 0;
      for (const item of itemsArr) {
        const qty   = parseFloat(item.quantity)  || 0;
        const price = parseFloat(item.unitPrice) || 0;
        const total = qty * price;
        totalAmount += total;
        await client.query(
          'INSERT INTO bill_items (bill_id, description, quantity, unit_price, total) VALUES ($1, $2, $3, $4, $5)',
          [billId, item.description, qty, price, total]
        );
      }
      setClauses.push(`total_amount = $${idx++}`);
      params.push(totalAmount);
    }

    if (setClauses.length > 0) {
      params.push(billId);
      await client.query(
        `UPDATE bills SET ${setClauses.join(', ')} WHERE id = $${idx}`,
        params
      );
    }

    await client.query('COMMIT');

    const bill      = await query('SELECT * FROM bills WHERE id = $1', [billId]);
    const billItems = await query('SELECT * FROM bill_items WHERE bill_id = $1', [billId]);
    res.json({ bill: bill.rows[0], items: billItems.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('updateBill error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  } finally {
    client.release();
  }
};

// DELETE /api/workspaces/:workspaceId/bills/:billId
const deleteBill = async (req, res) => {
  try {
    await query('DELETE FROM bills WHERE id = $1', [req.params.billId]);
    res.json({ message: 'Bill deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/workspaces/:workspaceId/bills/summary
const getBillingSummary = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const result = await query(
      `SELECT
        COUNT(*) AS total_bills,
        -- Paid: fully paid bills + partial amounts already received
        SUM(CASE WHEN status = 'paid' THEN total_amount
                 ELSE COALESCE(amount_paid, 0) END) AS total_paid,
        -- Pending: remaining unpaid amount on all non-paid bills
        SUM(CASE WHEN status != 'paid' THEN total_amount - COALESCE(amount_paid, 0)
                 ELSE 0 END) AS total_pending,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) AS overdue_count
       FROM bills WHERE workspace_id = $1`,
      [workspaceId]
    );
    res.json({ summary: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPayments = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const result = await query(
      `SELECT p.*, u.name AS created_by_name
       FROM payments p
       LEFT JOIN users u ON u.id = p.created_by
       WHERE p.workspace_id = $1
       ORDER BY p.created_at DESC`,
      [workspaceId]
    );
    res.json({ payments: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const recordPayment = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { amount, note } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Valid payment amount required' });
    }

    const result = await query(
      `INSERT INTO payments (workspace_id, amount, note, created_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [workspaceId, parseFloat(amount), note || null, req.user.id]
    );

    res.status(201).json({ payment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const deletePayment = async (req, res) => {
  try {
    await query('DELETE FROM payments WHERE id = $1', [req.params.paymentId]);
    res.json({ message: 'Payment record deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getBills, getBill, createBill, updateBill, deleteBill, getBillingSummary, getPayments, recordPayment, deletePayment };