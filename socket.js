import { Server } from "socket.io";
import adminService from "./src/service/adminService.js";
import redisService from "./src/service/redisService.js";
import MessageModel from "./src/model/chatModel.js";

const connectedUsers = new Map(); // userId => socketId

const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    io.on("connection", async (socket) => {
        const redisClient = redisService.getRedisClient();

        const userId = socket.handshake.query.userId;

        if (!userId) {
            console.warn(`❌ Rejected socket ${socket.id} — missing userId`);
            socket.disconnect(true); // 🔌 Force disconnect if no userId
            return;
        }

        connectedUsers.set(userId, socket.id);
        console.log(`✅ ${userId} connected with socket ${socket.id}`);

        const offlineKey = `offlineMessages:${userId}`;
        try {
            const messages = await redisClient.lRange(offlineKey, 0, -1);
            if (messages.length > 0) {
                messages.forEach((msg) => {
                    socket.emit("receiveMsg", JSON.parse(msg));
                });
                await redisClient.del(offlineKey);
            }
        } catch (err) {
            console.error("Error sending offline messages:", err.message);
        }

        socket.on("sendMsg", async (data) => {
            try {
                if (typeof data === "string") data = JSON.parse(data);
                if (!data || typeof data !== "object") throw new Error("Invalid message format");

                const { from, to, message, post_id, msgType, post_url } = data;
                if (!from || !to || !message) throw new Error("Missing fields");

                const participants = [from, to].sort();
                const timestamp = new Date();

                // Save to MongoDB
                const chatDoc = await MessageModel.findOneAndUpdate(
                    { participants },
                    {
                        $push: { messages: { message, timestamp, sender: from, post_id, msgType, post_url } },
                        $setOnInsert: { participants },
                    },
                    { new: true, upsert: true, setDefaultsOnInsert: true }
                );

                const latestMessage = chatDoc.messages.at(-1);
                const messageObj = {
                    chat_id: chatDoc._id.toString(),
                    _id: latestMessage._id,
                    from,
                    to,
                    message,
                    timestamp,
                    post_id, msgType, post_url
                };

                const chatKey = `chat:${from}:${to}`;
                await redisClient.lPush(chatKey, JSON.stringify(messageObj));

                const receiverSocketId = connectedUsers.get(to);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("receiveMsg", messageObj);
                } else {
                    await redisClient.rPush(`offlineMessages:${to}`, JSON.stringify(messageObj));
                }

                socket.emit("sendedMsg", { success: true, data: messageObj });
            } catch (err) {
                console.error("Error in sendMsg:", err.message);
                socket.emit("sendedMsg", { success: false, message: err.message });
            }
        });

        // ✍️ Typing event
        socket.on("typing", (data) => {
            try {
                if (typeof data === "string") data = JSON.parse(data);
                const { from, to } = data;
                const receiverSocketId = connectedUsers.get(to);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("userTyping", { from });
                }
            } catch (err) {
                console.log("Error in typing event:", err.message);
            }
        });

        // 🔌 On disconnect
        socket.on("disconnect", async () => {
            for (const [uid, sid] of connectedUsers.entries()) {
                if (sid === socket.id) {
                    connectedUsers.delete(uid);
                    await redisClient.hDel("connectedUsers", uid);
                    console.log(`❌ Disconnected: ${uid}`);
                    break;
                }
            }
        });
    });

    return io;
};

export { connectedUsers, initializeSocket };
