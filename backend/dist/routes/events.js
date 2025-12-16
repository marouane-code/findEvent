"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = __importDefault(require("../middleware/auth"));
const router = (0, express_1.Router)();
// GET /events?lat=..&lng=..&radius=..
router.get('/', async (req, res) => {
    try {
        const lat = parseFloat(req.query.lat) || 0;
        const lng = parseFloat(req.query.lng) || 0;
        const radiusKm = parseFloat(req.query.radius) || 10; // km
        // simple bounding box approx
        const latDelta = radiusKm / 111; // ~111 km per deg
        const lngDelta = radiusKm / (111 * Math.max(0.000001, Math.cos((lat * Math.PI) / 180)));
        const [rows] = await db_1.default.query('SELECT e.*, u.name as organizer_name, u.email as organizer_email FROM events e JOIN users u ON u.id = e.organizer_id WHERE e.lat BETWEEN ? AND ? AND e.lng BETWEEN ? AND ? ORDER BY e.start_time ASC', [lat - latDelta, lat + latDelta, lng - lngDelta, lng + lngDelta]);
        res.json({ events: rows });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});
// GET /events/:id
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const [rows] = await db_1.default.query('SELECT e.*, u.name as organizer_name, u.email as organizer_email FROM events e JOIN users u ON u.id = e.organizer_id WHERE e.id = ?', [id]);
        if (!rows.length)
            return res.status(404).json({ error: 'not found' });
        res.json({ event: rows[0] });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});
// POST /events (protected)
router.post('/', auth_1.default, async (req, res) => {
    try {
        const { title, description, start_time, lat, lng } = req.body;
        if (!title || !start_time || !lat || !lng)
            return res.status(400).json({ error: 'missing fields' });
        const organizerId = req.user.userId;
        const [result] = await db_1.default.query('INSERT INTO events (title, description, start_time, lat, lng, organizer_id) VALUES (?, ?, ?, ?, ?, ?)', [title, description || null, start_time, lat, lng, organizerId]);
        res.status(201).json({ id: result.insertId });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});
// POST /events/:id/participate (protected)
router.post('/:id/participate', auth_1.default, async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user.userId;
        // check event exists
        const [ev] = await db_1.default.query('SELECT id FROM events WHERE id = ?', [eventId]);
        if (!ev.length)
            return res.status(404).json({ error: 'event not found' });
        // check existing participation
        const [existing] = await db_1.default.query('SELECT id FROM participations WHERE user_id = ? AND event_id = ?', [userId, eventId]);
        if (existing.length)
            return res.status(400).json({ error: 'already participating' });
        const [result] = await db_1.default.query('INSERT INTO participations (user_id, event_id, status) VALUES (?, ?, ?)', [userId, eventId, 'pending']);
        res.status(201).json({ id: result.insertId });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});
exports.default = router;
