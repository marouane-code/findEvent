"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const auth_1 = __importDefault(require("../middleware/auth"));
const router = (0, express_1.Router)();
// GET /chat/event/:eventId/messages
router.get('/event/:eventId/messages', async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const [rows] = await db_1.default.query('SELECT m.*, u.name as sender_name FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.event_id = ? ORDER BY m.created_at ASC', [eventId]);
        res.json({ messages: rows });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});
// POST /chat/event/:eventId/messages (protected) - create a message (alternative to socket)
router.post('/event/:eventId/messages', auth_1.default, async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const senderId = req.user.userId;
        const { content } = req.body;
        if (!content)
            return res.status(400).json({ error: 'content required' });
        const [result] = await db_1.default.query('INSERT INTO messages (sender_id, event_id, content) VALUES (?, ?, ?)', [senderId, eventId, content]);
        res.status(201).json({ id: result.insertId });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});
exports.default = router;
