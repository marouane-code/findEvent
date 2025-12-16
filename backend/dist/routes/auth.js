"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
// POST /auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'email and password required' });
        const [rows] = await db_1.default.query('SELECT id FROM users WHERE email = ?', [email]);
        if (rows.length)
            return res.status(400).json({ error: 'email exists' });
        const hash = await bcrypt_1.default.hash(password, 10);
        const [result] = await db_1.default.query('INSERT INTO users (email, password, name) VALUES (?, ?, ?)', [email, hash, name || null]);
        const userId = result.insertId;
        const token = jsonwebtoken_1.default.sign({ userId, email, name }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: userId, email, name } });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});
// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'email and password required' });
        const [rows] = await db_1.default.query('SELECT id, password, name FROM users WHERE email = ?', [email]);
        if (!rows.length)
            return res.status(400).json({ error: 'invalid credentials' });
        const user = rows[0];
        const ok = await bcrypt_1.default.compare(password, user.password);
        if (!ok)
            return res.status(400).json({ error: 'invalid credentials' });
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email, name: user.name }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, email, name: user.name } });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'server error' });
    }
});
exports.default = router;
