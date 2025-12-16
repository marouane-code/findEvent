import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db';

const router = Router();

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const [rows]: any = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length) return res.status(400).json({ error: 'email exists' });
    const hash = await bcrypt.hash(password, 10);
    const [result]: any = await pool.query('INSERT INTO users (email, password, name) VALUES (?, ?, ?)', [email, hash, name || null]);
    const userId = result.insertId;
    const token = jwt.sign({ userId, email, name }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: userId, email, name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const [rows]: any = await pool.query('SELECT id, password, name FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(400).json({ error: 'invalid credentials' });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'invalid credentials' });
    const token = jwt.sign({ userId: user.id, email, name: user.name }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email, name: user.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

export default router;

// GET /auth/find?name=...  - simple user search by name (returns first match)
router.get('/find', async (req, res) => {
  try {
    const q = (req.query.name || '').toString().trim();
    if (!q) return res.status(400).json({ error: 'name required' });
    const [rows]: any = await pool.query('SELECT id, name, email FROM users WHERE name LIKE ? OR email LIKE ? LIMIT 10', [`%${q}%`, `%${q}%`]);
    res.json({ users: rows || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});
