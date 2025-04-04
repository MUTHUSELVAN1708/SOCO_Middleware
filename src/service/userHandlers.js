import registerModel from "../model/registerModel.js";
import businessRegisterModel from "../model/BusinessModel.js";
import ChatMember from "../model/chatMembers.js";

export const handleUserOnline = async (io, socket, onlineUsers, userId) => {
    if (onlineUsers[userId] && onlineUsers[userId] !== socket.id) {
        console.warn(`[${new Date().toISOString()}] User ${userId} already has an active connection. Closing previous connection.`);
        io.sockets.sockets.get(onlineUsers[userId])?.disconnect(true);
    }

    onlineUsers[userId] = socket.id;
    console.log(`[${new Date().toISOString()}] User online: ${userId}, Socket ID: ${socket.id}`);

    try {
        let user = await registerModel.findByIdAndUpdate(userId, { onlineStatus: true, lastOnline: new Date() });

        if (!user) {
            user = await businessRegisterModel.findByIdAndUpdate(userId, { onlineStatus: true, lastOnline: new Date() });
        }

        if (user) {
            await ChatMember.findOneAndUpdate({ userId }, { isOnline: true });
            await ChatMember.updateMany(
                { "player.playerId": userId },
                { $set: { "player.$.isOnline": true } }
            );
            io.emit("update-status", { userId, online: true });
        } else {
            console.warn(`[${new Date().toISOString()}] No user found in either registerModel or businessRegisterModel for userId: ${userId}`);
        }
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error updating user online status:`, error);
    }
};

export const handleUserOffline = async (io, userId) => {
    const lastSeen = new Date();
    let user = await registerModel.findByIdAndUpdate(userId, { onlineStatus: false, lastOnline: lastSeen });

    if (!user) {
        user = await businessRegisterModel.findByIdAndUpdate(userId, { onlineStatus: false, lastOnline: lastSeen });
    }

    await ChatMember.findOneAndUpdate({ userId }, { isOnline: false, lastSeen });
    await ChatMember.updateMany(
        { "player.playerId": userId },
        { $set: { "player.$.isOnline": false, "player.$.lastSeen": lastSeen } }
    );

    if (user) {
        io.emit("update-status", { userId, online: false });
    } else {
        console.warn(`[${new Date().toISOString()}] No user found in either registerModel or businessRegisterModel for userId: ${userId}`);
    }
};

export const getChatMembers = async (userId) => {
    try {
        const chatMembers = await ChatMember.find({ userId });

        if (!chatMembers.length) {
            console.warn(`[${new Date().toISOString()}] No chat members found for user ${userId}`);
            return [];
        }

        return chatMembers;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching chat members for user ${userId}:`, error);
        throw error;
    }
};