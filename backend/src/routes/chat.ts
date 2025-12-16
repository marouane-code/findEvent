import { Router } from 'express';
import pool from '../db';
import verifyToken, { AuthRequest } from '../middleware/auth';

const router = Router();

// GET /chat/event/:eventId/messages
router.get('/event/:eventId/messages', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const [rows]: any = await pool.query(
      'SELECT m.*, u.name as sender_name FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.event_id = ? ORDER BY m.created_at ASC',
      [eventId]
    );
    res.json({ messages: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /chat/private/:userA/:userB - messages between two users (both directions)
router.get('/private/:userA/:userB', async (req, res) => {
  try {
    const userA = req.params.userA;
    const userB = req.params.userB;
    const [rows]: any = await pool.query(
      'SELECT m.*, u.name as sender_name FROM messages m JOIN users u ON u.id = m.sender_id WHERE ((m.sender_id = ? AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = ?)) ORDER BY m.created_at ASC',
      [userA, userB, userB, userA]
    );
    res.json({ messages: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /chat/conversations - list private conversation counterparts for current user (protected)
router.get('/conversations', verifyToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.userId;
    const [rows]: any = await pool.query(
      `SELECT t.other_id, u.name as other_name, m.content, m.created_at, m.sender_id FROM (
         SELECT CASE WHEN sender_id = ? THEN recipient_id ELSE sender_id END AS other_id, MAX(id) as last_id
         FROM messages
         WHERE (sender_id = ? OR recipient_id = ?) AND recipient_id IS NOT NULL
         GROUP BY other_id
       ) t
       JOIN messages m ON m.id = t.last_id
       JOIN users u ON u.id = t.other_id
       ORDER BY m.created_at DESC`,
      [userId, userId, userId]
    );
    res.json({ conversations: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /chat/event/:eventId/messages (protected) - create a message (alternative to socket)
router.post('/event/:eventId/messages', verifyToken, async (req: AuthRequest, res) => {
  try {
    const eventId = req.params.eventId;
    const senderId = req.user.userId;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });
    const [result]: any = await pool.query('INSERT INTO messages (sender_id, event_id, content) VALUES (?, ?, ?)', [senderId, eventId, content]);
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

export default router;
