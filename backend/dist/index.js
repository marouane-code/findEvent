"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const events_1 = __importDefault(require("./routes/events"));
const chat_1 = __importDefault(require("./routes/chat"));
const db_1 = __importDefault(require("./db"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Basic routes
app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/auth', auth_1.default);
app.use('/events', events_1.default);
app.use('/chat', chat_1.default);
const port = process.env.PORT || 4000;
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: { origin: '*' }
});
io.on('connection', (socket) => {
    console.log('socket connected', socket.id);
    // client should emit 'identify' with { userId } after connecting
    socket.on('identify', (payload) => {
        try {
            if (payload && payload.userId) {
                const room = `user_${payload.userId}`;
                socket.join(room);
            }
        }
        catch (err) { }
    });
    socket.on('joinEvent', (room) => socket.join(`event_${room}`));
    socket.on('leaveEvent', (room) => socket.leave(`event_${room}`));
    socket.on('eventMessage', async (payload) => {
        // payload should include { eventId, senderId, content }
        try {
            if (payload && payload.eventId && payload.senderId && payload.content) {
                // persist
                await db_1.default.query('INSERT INTO messages (sender_id, event_id, content) VALUES (?, ?, ?)', [payload.senderId, payload.eventId, payload.content]);
                io.to(`event_${payload.eventId}`).emit('newEventMessage', payload);
            }
        }
        catch (err) {
            console.error('socket eventMessage error', err);
        }
    });
    socket.on('privateMessage', async (payload) => {
        // payload { toUserId, senderId, content }
        try {
            if (payload && payload.toUserId && payload.senderId && payload.content) {
                // persist as message with recipient_id
                await db_1.default.query('INSERT INTO messages (sender_id, recipient_id, content) VALUES (?, ?, ?)', [payload.senderId, payload.toUserId, payload.content]);
                io.to(`user_${payload.toUserId}`).emit('newPrivateMessage', payload);
            }
        }
        catch (err) {
            console.error('socket privateMessage error', err);
        }
    });
});
server.listen(port, () => console.log(`Server listening on ${port}`));
