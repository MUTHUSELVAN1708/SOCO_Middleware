import mongoose from "mongoose";
import registerModel from "../model/registerModel.js";
import Friend from "../model/FriendModel.js";


let onlineUsers = {};

const chatSocket = (io) => {
    io.on("connection", (socket) => {
        console.log(`[${new Date().toISOString()}] User connected: ${socket.id}`);

        // Prevent duplicate WebSocket upgrades
        if (Object.values(onlineUsers).includes(socket.id)) {
            console.warn(`[${new Date().toISOString()}] Duplicate socket connection detected: ${socket.id}`);
            socket.disconnect(true); // Close duplicate connection
            return;
        }

        // Handle user coming online
        socket.on("user-online", async (userId) => {
            if (onlineUsers[userId] && onlineUsers[userId] !== socket.id) {
                console.warn(`[${new Date().toISOString()}] User ${userId} already has an active connection. Closing previous connection.`);
                io.sockets.sockets.get(onlineUsers[userId])?.disconnect(true); // Close old socket
            }

            onlineUsers[userId] = socket.id;
            console.log(`[${new Date().toISOString()}] User online: ${userId}, Socket ID: ${socket.id}`);

            try {
                await registerModel.findByIdAndUpdate(userId, { onlineStatus: true, lastOnline: new Date() });
                io.emit("update-status", { userId, online: true });
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Error updating user online status:`, error);
            }
        });

        // Fetch chat members
        socket.on("get-chat-members", async (userId) => {
            try {
                const userFriends = await Friend.findOne({ userId });
                if (!userFriends) {
                    console.warn(`[${new Date().toISOString()}] No friends found for user ${userId}`);
                    socket.emit("chat-members", []);
                    return;
                }

                const acceptedFriends = userFriends.friends.filter(friend => friend.status === "Accepted");
                socket.emit("chat-members", acceptedFriends);
                console.log(`[${new Date().toISOString()}] Sent chat members for user ${userId}`);
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Error fetching chat members for user ${userId}:`, error);
                socket.emit("chat-members-error", "Error retrieving chat members.");
            }
        });

        // Handle typing
        socket.on("user-typing", ({ senderId, receiverId }) => {
            console.log(`[${new Date().toISOString()}] User typing: Sender: ${senderId}, Receiver: ${receiverId}`);

            if (onlineUsers[receiverId]) {
                io.to(onlineUsers[receiverId]).emit("typing", { senderId });
            } else {
                console.warn(`[${new Date().toISOString()}] Receiver ${receiverId} is not online.`);
            }
        });

        // Handle stop typing
        socket.on("user-stop-typing", ({ senderId, receiverId }) => {
            console.log(`[${new Date().toISOString()}] User stopped typing: Sender: ${senderId}, Receiver: ${receiverId}`);

            if (onlineUsers[receiverId]) {
                io.to(onlineUsers[receiverId]).emit("stop-typing", { senderId });
            } else {
                console.warn(`[${new Date().toISOString()}] Receiver ${receiverId} is not online.`);
            }
        });

        // **Listen for database changes in Friend collection**
        const friendChangeStream = Friend.watch();
        friendChangeStream.on("change", (change) => {
            console.log(`[${new Date().toISOString()}] Change detected in friend collection:`, change);
        
            if (change.operationType === "update") {
                const updatedUserId = change.documentKey._id;
                console.log(`[${new Date().toISOString()}] Update operation detected for user ID: ${updatedUserId}`);
        
                // Extract modified fields
                const updatedFields = change.updateDescription.updatedFields;
                console.log(`[${new Date().toISOString()}] Updated fields:`, updatedFields);
                
                const isFriendsUpdated = Object.keys(updatedFields).some(field => field.startsWith("friends."));

                console.log(isFriendsUpdated);
                if (isFriendsUpdated) {
                    console.log(`[${new Date().toISOString()}] Friends list updated for user ID: ${updatedUserId}`);
                    console.log(onlineUsers);
                    // Notify the user about updated friend requests
                    const socketId = onlineUsers[updatedUserId];
        
                    if (socketId) {
                        console.log(`[${new Date().toISOString()}] Sending friend-list-updated event to socket ID: ${socketId}`);
                        io.to(socketId).emit("friend-list-updated", updatedFields["friends"]);
                    } else {
                        console.log(`[${new Date().toISOString()}] User ID ${updatedUserId} is not online. Skipping notification.`);
                    }
                } else {
                    console.log(`[${new Date().toISOString()}] No changes in friends list for user ID: ${updatedUserId}`);
                }
            } else {
                console.log(`[${new Date().toISOString()}] Ignoring non-update operation type: ${change.operationType}`);
            }
        });
        
    
        friendChangeStream.on("error", (error) => {
            console.error(`[${new Date().toISOString()}] Change Stream Error:`, error);
        });
        

        // Handle disconnection
        socket.on("disconnect", async () => {
            let userId = Object.keys(onlineUsers).find((key) => onlineUsers[key] === socket.id);

            if (userId) {
                console.log(`[${new Date().toISOString()}] User disconnected: ${userId}, Socket ID: ${socket.id}`);

                delete onlineUsers[userId];

                try {
                    await registerModel.findByIdAndUpdate(userId, { onlineStatus: false, lastOnline: new Date() });
                    io.emit("update-status", { userId, online: false });
                } catch (error) {
                    console.error(`[${new Date().toISOString()}] Error updating user offline status:`, error);
                }
            } else {
                console.warn(`[${new Date().toISOString()}] Unknown user disconnected: Socket ID: ${socket.id}`);
            }
        });
    });
};

export default chatSocket;
