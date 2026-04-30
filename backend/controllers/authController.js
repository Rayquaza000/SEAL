const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { uploadBuffer } = require('../config/cloudinary');

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0)
      return res.status(409).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const result = await query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, avatar_url, created_at',
      [name.trim(), email.toLowerCase(), hashed]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);
    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0)
      return res.status(401).json({ message: 'Invalid credentials' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(user.id);
    const { password: _pw, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMe = async (req, res) => {
  try {
    const workspaces = await query(
      `SELECT w.id, w.name, wm.role 
       FROM workspaces w 
       JOIN workspace_members wm ON wm.workspace_id = w.id 
       WHERE wm.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json({ user: req.user, workspaces: workspaces.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    let avatar_url = null;

    if (req.file) {
      const uploaded = await uploadBuffer(req.file.buffer, 'seal/avatars', {
        transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }],
      });
      avatar_url = uploaded.url;
    }

    let updateQuery, params;
    if (avatar_url) {
      updateQuery = 'UPDATE users SET name = COALESCE($1, name), avatar_url = $2 WHERE id = $3 RETURNING id, name, email, avatar_url';
      params = [name, avatar_url, req.user.id];
    } else {
      updateQuery = 'UPDATE users SET name = COALESCE($1, name) WHERE id = $2 RETURNING id, name, email, avatar_url';
      params = [name, req.user.id];
    }

    const result = await query(updateQuery, params);
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!valid) return res.status(400).json({ message: 'Current password incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword };