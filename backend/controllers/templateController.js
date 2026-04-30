const { query, getClient } = require('../config/db');

// GET /api/workspaces/:workspaceId/templates
const getTemplates = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const result = await query(
      `SELECT pt.*, u.name AS created_by_name,
        COUNT(ts.id) AS stage_count
       FROM process_templates pt
       LEFT JOIN users u ON u.id = pt.created_by
       LEFT JOIN template_stages ts ON ts.template_id = pt.id
       WHERE pt.workspace_id = $1
       GROUP BY pt.id, u.name
       ORDER BY pt.created_at DESC`,
      [workspaceId]
    );
    res.json({ templates: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/workspaces/:workspaceId/templates/:templateId
const getTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await query('SELECT * FROM process_templates WHERE id = $1', [templateId]);
    if (template.rows.length === 0) return res.status(404).json({ message: 'Template not found' });

    const stages = await query(
      'SELECT * FROM template_stages WHERE template_id = $1 ORDER BY stage_order',
      [templateId]
    );

    res.json({ template: template.rows[0], stages: stages.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/workspaces/:workspaceId/templates
const createTemplate = async (req, res) => {
  const client = await getClient();
  try {
    const { workspaceId } = req.params;
    const { name, description, stages } = req.body;

    if (!name || !stages?.length) {
      return res.status(400).json({ message: 'Template name and stages required' });
    }

    await client.query('BEGIN');
    const tmpl = await client.query(
      'INSERT INTO process_templates (workspace_id, name, description, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [workspaceId, name, description || null, req.user.id]
    );

    for (let i = 0; i < stages.length; i++) {
      await client.query(
        'INSERT INTO template_stages (template_id, name, stage_order) VALUES ($1, $2, $3)',
        [tmpl.rows[0].id, stages[i], i + 1]
      );
    }

    await client.query('COMMIT');

    const fullStages = await query(
      'SELECT * FROM template_stages WHERE template_id = $1 ORDER BY stage_order',
      [tmpl.rows[0].id]
    );

    res.status(201).json({ template: tmpl.rows[0], stages: fullStages.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// DELETE /api/workspaces/:workspaceId/templates/:templateId
const deleteTemplate = async (req, res) => {
  try {
    await query('DELETE FROM process_templates WHERE id = $1', [req.params.templateId]);
    res.json({ message: 'Template deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getTemplates, getTemplate, createTemplate, deleteTemplate };
