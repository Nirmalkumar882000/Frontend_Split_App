const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { connectMongoDB, mysqlPool } = require('./config/db');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
});

// Connect to MongoDB
connectMongoDB();



app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);

// ─── Real-Time Presence Tracking ──────────────────────────────────────────────
const groupPresence = new Map();

function getOnlineUsers(groupId) {
    return Array.from(groupPresence.get(groupId) || []);
}

// ─── Socket.io Real-Time Engine ───────────────────────────────────────────────
io.on('connection', (socket) => {
    let currentGroupId = null;
    let currentUser = null;

    // ── Join group room ──────────────────────────────────────────────────────
    socket.on('joinGroup', async ({ groupId, userId, userName }) => {
        socket.join(`group_${groupId}`);
        currentGroupId = groupId;
        currentUser = { userId, userName };

        if (!groupPresence.has(groupId)) {
            groupPresence.set(groupId, new Set());
        }
        groupPresence.get(groupId).add(socket.id);

        const online = getOnlineUsers(groupId);
        io.to(`group_${groupId}`).emit('onlineUsers', online);

        try {
            const messages = await Message.find({ group_id: groupId })
                .sort({ timestamp: -1 })
                .limit(50);
            socket.emit('loadMessages', messages.reverse());
        } catch (err) {
            console.error('Load messages error:', err.message);
        }
    });

    // ── Join personal room (for dashboard notifications) ─────────────────────
    socket.on('joinUserRoom', (userId) => {
        socket.join(`user_${userId}`);
    });

    // ── Chat message ──────────────────────────────────────────────────────────
    socket.on('chatMessage', async ({ groupId, senderId, senderName, message }) => {
        if (!message || !message.trim() || message.length > 500) return;

        try {
            const newMessage = new Message({
                group_id: groupId,
                sender_id: senderId,
                sender_name: senderName,
                message: message.trim(),
            });
            await newMessage.save();

            io.to(`group_${groupId}`).emit('message', {
                ...newMessage.toObject(),
                delivered: true,
            });

            // Mirror to Admin Console
            io.to('admin_node').emit('admin_message', {
                ...newMessage.toObject(),
                groupId
            });
        } catch (err) {
            console.error('Chat message error:', err.message);
        }
    });

    // ── Admin Telemetry Channel ─────────────────────────────────────────────
    socket.on('admin_join', () => {
        socket.join('admin_node');
        console.log('\x1b[36m⚡ Admin Terminal Active\x1b[0m');
    });

    // ── Typing indicator ──────────────────────────────────────────────────────
    socket.on('typing', ({ groupId, userName, isTyping }) => {
        socket.to(`group_${groupId}`).emit('userTyping', { userName, isTyping });
    });

    // ── Message read receipt ──────────────────────────────────────────────────
    socket.on('messageRead', ({ groupId, userId, messageId }) => {
        socket.to(`group_${groupId}`).emit('readReceipt', { userId, messageId });
    });

    // ── Reaction to a message ─────────────────────────────────────────────────
    socket.on('messageReaction', ({ groupId, messageId, emoji, userId, userName }) => {
        io.to(`group_${groupId}`).emit('reactionUpdate', { messageId, emoji, userId, userName });
    });

    socket.on('disconnect', () => {
        if (currentGroupId && groupPresence.has(currentGroupId)) {
            groupPresence.get(currentGroupId).delete(socket.id);
            const online = getOnlineUsers(currentGroupId);
            io.to(`group_${currentGroupId}`).emit('onlineUsers', online);


            if (currentUser) {
                socket.to(`group_${currentGroupId}`).emit('userLeft', {
                    userName: currentUser.userName,
                });
            }
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
