const { query, getClient } = require('../config/db');
const { deleteImage } = require('../config/cloudinary');

// GET /api/workspaces/:workspaceId/products
const getProducts = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { search, status, assignedTo } = req.query;
    const isOwner = req.workspaceRole === 'owner';

    let baseQuery = `
      SELECT p.id, p.product_code, p.name, p.client, p.status, p.concept_image_url,
             p.created_at, u.name AS assigned_to_name,
             ROUND(
               100.0 * COUNT(CASE WHEN ps.status = 'completed' THEN 1 END) / NULLIF(COUNT(ps.id), 0)
             ) AS progress,
             ps2.name AS current_stage
      FROM products p
      LEFT JOIN users u ON u.id = p.assigned_to
      LEFT JOIN product_stages ps ON ps.product_id = p.id
      LEFT JOIN product_stages ps2 ON ps2.id = (
        SELECT id FROM product_stages WHERE product_id = p.id AND status != 'completed' ORDER BY stage_order LIMIT 1
      )
      WHERE p.workspace_id = $1
    `;
    const params = [workspaceId];
    let idx = 2;

    // Employees only see products/stages assigned to them
    if (!isOwner) {
      baseQuery += ` AND (p.assigned_to = $${idx} OR EXISTS (
        SELECT 1 FROM product_stages WHERE product_id = p.id AND assigned_to = $${idx}
      ))`;
      params.push(req.user.id);
      idx++;
    }

    if (search) {
      baseQuery += ` AND (LOWER(p.name) LIKE LOWER($${idx}) OR LOWER(p.product_code) LIKE LOWER($${idx}) OR LOWER(p.client) LIKE LOWER($${idx}))`;
      params.push(`%${search}%`);
      idx++;
    }

    if (status) {
      baseQuery += ` AND p.status = $${idx}`;
      params.push(status);
      idx++;
    }

    if (assignedTo) {
      baseQuery += ` AND p.assigned_to = $${idx}`;
      params.push(assignedTo);
      idx++;
    }

    baseQuery += ' GROUP BY p.id, u.name, ps2.name ORDER BY p.created_at DESC';

    const result = await query(baseQuery, params);
    res.json({ products: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/workspaces/:workspaceId/products/:productId
const getProduct = async (req, res) => {
  try {
    const { workspaceId, productId } = req.params;

    const product = await query(
      `SELECT p.*, u.name AS assigned_to_name, u.email AS assigned_to_email
       FROM products p LEFT JOIN users u ON u.id = p.assigned_to
       WHERE p.id = $1 AND p.workspace_id = $2`,
      [productId, workspaceId]
    );
    if (product.rows.length === 0) return res.status(404).json({ message: 'Product not found' });

    const stages = await query(
      `SELECT ps.*, u.name AS assigned_to_name 
       FROM product_stages ps LEFT JOIN users u ON u.id = ps.assigned_to
       WHERE ps.product_id = $1 ORDER BY ps.stage_order`,
      [productId]
    );

    const materials = await query(
      `SELECT pm.*, i.name AS material_name, i.unit
       FROM product_materials pm JOIN inventory i ON i.id = pm.inventory_id
       WHERE pm.product_id = $1`,
      [productId]
    );

    res.json({ product: product.rows[0], stages: stages.rows, materials: materials.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/workspaces/:workspaceId/products
const createProduct = async (req, res) => {
  const client = await getClient();
  try {
    const { workspaceId } = req.params;
    const { name, client: clientName, assignedTo, stages, materials, templateId, notes } = req.body;

    const stagesArr = typeof stages === 'string' ? JSON.parse(stages) : stages || [];
    const materialsArr = typeof materials === 'string' ? JSON.parse(materials) : materials || [];

    if (!name) return res.status(400).json({ message: 'Product name required' });

    // Auto-generate product code
    const count = await query('SELECT COUNT(*) FROM products WHERE workspace_id = $1', [workspaceId]);
    const productCode = `#${String(parseInt(count.rows[0].count) + 101).padStart(3, '0')}`;

    const conceptImageUrl = req.files?.conceptImage?.[0]?.path || null;
    const conceptImagePublicId = req.files?.conceptImage?.[0]?.filename || null;

    await client.query('BEGIN');

    const product = await client.query(
      `INSERT INTO products (workspace_id, product_code, name, client, concept_image_url, 
        concept_image_public_id, assigned_to, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [workspaceId, productCode, name.trim(), clientName || null, conceptImageUrl,
       conceptImagePublicId, assignedTo || null, notes || null]
    );

    const productId = product.rows[0].id;

    // If template provided, load its stages
    let stageList = stagesArr;
    if (templateId && stageList.length === 0) {
      const tmplStages = await client.query(
        'SELECT * FROM template_stages WHERE template_id = $1 ORDER BY stage_order',
        [templateId]
      );
      stageList = tmplStages.rows.map((s) => ({ name: s.name, assignedTo: null }));
    }

    // Insert stages
    for (let i = 0; i < stageList.length; i++) {
      await client.query(
        `INSERT INTO product_stages (product_id, name, stage_order, assigned_to)
         VALUES ($1, $2, $3, $4)`,
        [productId, stageList[i].name, i + 1, stageList[i].assignedTo || null]
      );
    }

    // Insert materials
    for (const mat of materialsArr) {
      if (mat.inventoryId && mat.quantity) {
        await client.query(
          'INSERT INTO product_materials (product_id, inventory_id, quantity) VALUES ($1, $2, $3)',
          [productId, mat.inventoryId, mat.quantity]
        );
        // Deduct from inventory
        await client.query(
          'UPDATE inventory SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2',
          [mat.quantity, mat.inventoryId]
        );
      }
    }

    await client.query('COMMIT');

    const fullProduct = await query(
      `SELECT p.*, u.name AS assigned_to_name FROM products p 
       LEFT JOIN users u ON u.id = p.assigned_to WHERE p.id = $1`,
      [productId]
    );
    const fullStages = await query(
      'SELECT * FROM product_stages WHERE product_id = $1 ORDER BY stage_order',
      [productId]
    );

    res.status(201).json({ product: fullProduct.rows[0], stages: fullStages.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// PUT /api/workspaces/:workspaceId/products/:productId
const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, client: clientName, assignedTo, notes } = req.body;

    const buildImageUrl = req.files?.buildImage?.[0]?.path || null;
    const buildImagePublicId = req.files?.buildImage?.[0]?.filename || null;
    const conceptImageUrl = req.files?.conceptImage?.[0]?.path || null;
    const conceptImagePublicId = req.files?.conceptImage?.[0]?.filename || null;

    let setClauses = [];
    let params = [];
    let idx = 1;

    if (name) { setClauses.push(`name = $${idx++}`); params.push(name); }
    if (clientName !== undefined) { setClauses.push(`client = $${idx++}`); params.push(clientName); }
    if (assignedTo !== undefined) { setClauses.push(`assigned_to = $${idx++}`); params.push(assignedTo || null); }
    if (notes !== undefined) { setClauses.push(`notes = $${idx++}`); params.push(notes); }
    if (buildImageUrl) {
      setClauses.push(`build_image_url = $${idx++}`); params.push(buildImageUrl);
      setClauses.push(`build_image_public_id = $${idx++}`); params.push(buildImagePublicId);
    }
    if (conceptImageUrl) {
      setClauses.push(`concept_image_url = $${idx++}`); params.push(conceptImageUrl);
      setClauses.push(`concept_image_public_id = $${idx++}`); params.push(conceptImagePublicId);
    }

    if (setClauses.length === 0) return res.status(400).json({ message: 'Nothing to update' });

    params.push(productId);
    const result = await query(
      `UPDATE products SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    res.json({ product: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/workspaces/:workspaceId/products/:productId
const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const product = await query('SELECT * FROM products WHERE id = $1', [productId]);
    if (product.rows[0]?.concept_image_public_id) {
      await deleteImage(product.rows[0].concept_image_public_id);
    }
    if (product.rows[0]?.build_image_public_id) {
      await deleteImage(product.rows[0].build_image_public_id);
    }
    await query('DELETE FROM products WHERE id = $1', [productId]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/workspaces/:workspaceId/products/:productId/save-template
const saveAsTemplate = async (req, res) => {
  const client = await getClient();
  try {
    const { productId, workspaceId } = req.params;
    const { templateName, description } = req.body;

    if (!templateName) return res.status(400).json({ message: 'Template name required' });

    const stages = await query(
      'SELECT name, stage_order FROM product_stages WHERE product_id = $1 ORDER BY stage_order',
      [productId]
    );

    await client.query('BEGIN');
    const tmpl = await client.query(
      'INSERT INTO process_templates (workspace_id, name, description, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [workspaceId, templateName, description || null, req.user.id]
    );

    for (const stage of stages.rows) {
      await client.query(
        'INSERT INTO template_stages (template_id, name, stage_order) VALUES ($1, $2, $3)',
        [tmpl.rows[0].id, stage.name, stage.stage_order]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ template: tmpl.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, saveAsTemplate };
