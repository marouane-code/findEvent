import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth';
import eventsRoutes from './routes/events';
import chatRoutes from './routes/chat';
import pool from './db';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Basic routes
app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/events', eventsRoutes);
app.use('/chat', chatRoutes);

const port = process.env.PORT || 4000;
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: '*' }
});

// expose io to express routes via app locals
app.set('io', io);

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  // client should emit 'identify' with { userId } after connecting
  socket.on('identify', (payload) => {
    try {
      if (payload && payload.userId) {
        const room = `user_${payload.userId}`;
        socket.join(room);
      }
    } catch (err) {}
  });

  socket.on('joinEvent', (room) => socket.join(`event_${room}`));
  socket.on('leaveEvent', (room) => socket.leave(`event_${room}`));

  socket.on('eventMessage', async (payload) => {
    // payload should include { eventId, senderId, content }
    try {
      if (payload && payload.eventId && payload.senderId && payload.content) {
        // persist
        await pool.query('INSERT INTO messages (sender_id, event_id, content) VALUES (?, ?, ?)', [payload.senderId, payload.eventId, payload.content]);
        io.to(`event_${payload.eventId}`).emit('newEventMessage', payload);
      }
    } catch (err) {
      console.error('socket eventMessage error', err);
    }
  });

  socket.on('privateMessage', async (payload) => {
    // payload { toUserId, senderId, content }
    try {
      if (payload && payload.toUserId && payload.senderId && payload.content) {
        // persist as message with recipient_id
        await pool.query('INSERT INTO messages (sender_id, recipient_id, content) VALUES (?, ?, ?)', [payload.senderId, payload.toUserId, payload.content]);
        io.to(`user_${payload.toUserId}`).emit('newPrivateMessage', payload);
        // also send a lightweight notification to the recipient
        io.to(`user_${payload.toUserId}`).emit('notification', { type: 'private', from: payload.senderId, fromName: payload.senderName || null, content: payload.content });
      }
    } catch (err) {
      console.error('socket privateMessage error', err);
    }
  });
});

server.listen(port, () => console.log(`Server listening on ${port}`));
