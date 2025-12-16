import { Router } from 'express';
import pool from '../db';
import verifyToken, { AuthRequest } from '../middleware/auth';

const router = Router();

// GET /events?lat=..&lng=..&radius=..
router.get('/', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat as string) || 0;
    const lng = parseFloat(req.query.lng as string) || 0;
    const radiusKm = parseFloat(req.query.radius as string) || 10; // km
    // simple bounding box approx
    const latDelta = radiusKm / 111; // ~111 km per deg
    const lngDelta = radiusKm / (111 * Math.max(0.000001, Math.cos((lat * Math.PI) / 180)));
    const [rows]: any = await pool.query(
      'SELECT e.*, u.name as organizer_name, u.email as organizer_email FROM events e JOIN users u ON u.id = e.organizer_id WHERE e.lat BETWEEN ? AND ? AND e.lng BETWEEN ? AND ? ORDER BY e.start_time ASC',
      [lat - latDelta, lat + latDelta, lng - lngDelta, lng + lngDelta]
    );
    res.json({ events: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /events/:id
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [rows]: any = await pool.query(
      'SELECT e.*, u.name as organizer_name, u.email as organizer_email FROM events e JOIN users u ON u.id = e.organizer_id WHERE e.id = ?',
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json({ event: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /events/:id/participants - list organizer + participants
router.get('/:id/participants', async (req, res) => {
  try {
    const id = req.params.id;
    // organizer
    const [org]: any = await pool.query('SELECT u.id, u.name, u.email FROM events e JOIN users u ON u.id = e.organizer_id WHERE e.id = ?', [id]);
    // participants
    const [parts]: any = await pool.query('SELECT u.id, u.name, u.email FROM participations p JOIN users u ON u.id = p.user_id WHERE p.event_id = ?', [id]);
    const organizer = org.length ? org[0] : null;
    res.json({ organizer, participants: parts || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /events (protected)
router.post('/', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { title, description, start_time, lat, lng } = req.body;
    if (!title || !start_time || !lat || !lng) return res.status(400).json({ error: 'missing fields' });
    const organizerId = req.user.userId;
    const [result]: any = await pool.query(
      'INSERT INTO events (title, description, start_time, lat, lng, organizer_id) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description || null, start_time, lat, lng, organizerId]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// POST /events/:id/participate (protected)
router.post('/:id/participate', verifyToken, async (req: AuthRequest, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.userId;
    // check event exists
    const [ev]: any = await pool.query('SELECT id FROM events WHERE id = ?', [eventId]);
    if (!ev.length) return res.status(404).json({ error: 'event not found' });
    // check existing participation
    const [existing]: any = await pool.query('SELECT id FROM participations WHERE user_id = ? AND event_id = ?', [userId, eventId]);
    if (existing.length) return res.status(400).json({ error: 'already participating' });
    const [result]: any = await pool.query('INSERT INTO participations (user_id, event_id, status) VALUES (?, ?, ?)', [userId, eventId, 'pending']);
    res.status(201).json({ id: result.insertId });
    // notify organizer via sockets if available (include participant name)
    try {
      const [[ev]]: any = await pool.query('SELECT organizer_id FROM events WHERE id = ?', [eventId]);
      const [[u]]: any = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [userId]);
      const io: any = req.app.get('io');
      if (io && ev && ev.organizer_id) {
        io.to(`user_${ev.organizer_id}`).emit('notification', { type: 'participation', eventId, from: userId, fromName: u ? (u.name || u.email) : null });
      }
    } catch (e) {
      console.error('notify organizer error', e);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// DELETE /events/:id (protected) - only organizer can delete
router.delete('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user.userId;
    const [rows]: any = await pool.query('SELECT organizer_id FROM events WHERE id = ?', [eventId]);
    if (!rows.length) return res.status(404).json({ error: 'event not found' });
    const organizerId = rows[0].organizer_id;
    if (Number(organizerId) !== Number(userId)) return res.status(403).json({ error: 'forbidden' });
    await pool.query('DELETE FROM events WHERE id = ?', [eventId]);
    // optionally notify participants that event was deleted
    const io: any = req.app.get('io');
    if (io) io.to(`event_${eventId}`).emit('eventDeleted', { eventId });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

export default router;

// GET /events/mine - list events organized by current user (protected)
router.get('/mine', verifyToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.userId;
    const [rows]: any = await pool.query('SELECT id, title, start_time FROM events WHERE organizer_id = ? ORDER BY start_time DESC', [userId]);
    res.json({ events: rows || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});
