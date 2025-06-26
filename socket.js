import { Server } from "socket.io";
import adminService from "./src/service/adminService.js";
import redisService from "./src/service/redisService.js";
import MessageModel from "./src/model/chatModel.js";
import Playlist from "./src/model/playlistModel.js";
import mongoose from "mongoose";

import { v4 as uuidv4, validate as isValidUUID } from "uuid";
import { sendChatNotification } from "./src/service/pushNotificationService.js";
import registerModel from "./src/model/registerModel.js";
import businessregisterModel from "./src/model/BusinessModel.js";
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

                const { from, to, message, post_id, msgType, post_url, fileName, fileSize } = data;

                if (!from || !to) throw new Error("Missing 'from' or 'to' fields");
                if (msgType === "text" && !message) throw new Error("Message content required for text type");
                if ((msgType === "image" || msgType === "document") && !post_url)
                    throw new Error("Media URL required for image/document");

                const participants = [from, to].sort();
                const timestamp = new Date();

                const messageData = {
                    message,
                    timestamp,
                    sender: from,
                    post_id,
                    msgType,
                    post_url,
                    fileName,
                    fileSize
                };

                const chatDoc = await MessageModel.findOneAndUpdate(
                    { participants },
                    {
                        $push: { messages: messageData },
                        $setOnInsert: { participants },
                    },
                    { new: true, upsert: true, setDefaultsOnInsert: true }
                );


                if (msgType === "post" && post_id) {
                    const postIdStr = String(post_id); // ensure it's a string to match your schema

                    let sharedPostsPlaylist = await Playlist.findOne({ userId: from, name: "SharedPosts" });

                    if (!sharedPostsPlaylist) {
                        sharedPostsPlaylist = await Playlist.create({
                            playlistId: uuidv4(),
                            userId: new mongoose.Types.ObjectId(from),
                            name: "SharedPosts",
                            videos: [],
                            isPublic: false,
                        });
                    }

                    if (!sharedPostsPlaylist.videos.includes(postIdStr)) {
                        await Playlist.updateOne(
                            { _id: sharedPostsPlaylist._id },
                            { $addToSet: { videos: postIdStr } }
                        );
                    }
                }


                const latestMessage = chatDoc.messages.at(-1);
                const messageObj = {
                    chat_id: chatDoc._id.toString(),
                    _id: latestMessage._id,
                    from,
                    to,
                    message,
                    timestamp,
                    post_id,
                    msgType,
                    post_url,
                    fileName,
                    fileSize
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
                let user = await registerModel.findById(to);

                if (!user) {
                    user = await businessregisterModel.findById(to);
                }

                if (!user) {
                    console.warn(`User not found for ID: ${to}`);
                } else {
                    const validPlayerIds = (user.subscriptionIDs || []).filter(id => isValidUUID(id));

                    if (validPlayerIds.length > 0) {
                        const notificationPayload = {
                            // userId: from,
                            playerIds: validPlayerIds,
                            title: `New message from ${user.username || "a user"}`,
                            additionalData: {
                                from,
                                to,
                                msgType
                            }
                        };

                        await sendChatNotification(notificationPayload);
                    } else {
                        console.warn(`No valid player IDs for user: ${to}`);
                    }
                }

            } catch (err) {
                console.error("Error in sendMsg:", err.message);
                socket.emit("sendedMsg", { success: false, message: err.message });
            }
        });


        socket.on("deleteMsg", async (data) => {
            try {
                const { chatKey, chatId, messagesToDelete } = data;

                if (!chatKey || !chatId || !Array.isArray(messagesToDelete)) {
                    return socket.emit("deletedMsg", {
                        success: false,
                        message: "chatKey, chatId, and messagesToDelete (array) are required"
                    });
                }

                const deleteResults = [];

                for (const message of messagesToDelete) {
                    // Delete from Redis
                    const redisResult = await redisService.deleteFromRedis(chatKey, message);

                    // Delete from MongoDB
                    const mongoResult = await MessageModel.updateOne(
                        { _id: chatId },
                        { $pull: { messages: { _id: message._id } } }
                    );

                    deleteResults.push({
                        messageId: message._id,
                        redis: redisResult,
                        mongo: mongoResult.modifiedCount > 0 ? "Deleted from DB" : "Not found in DB"
                    });
                }

                socket.emit("deletedMsg", { success: true, results: deleteResults });
            } catch (err) {
                console.error("Error in deleteMsg:", err.message);
                socket.emit("deletedMsg", { success: false, message: err.message });
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
