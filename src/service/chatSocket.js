// import mongoose from "mongoose";
// import registerModel from "../model/registerModel.js";
// import businessRegisterModel from "../model/BusinessModel.js";
// import Friend from "../model/FriendModel.js";
// import ChatMember from "../model/chatMembers.js";


// let onlineUsers = {};

// const chatSocket = (io) => {
//     io.on("connection", (socket) => {
//         console.log(`[${new Date().toISOString()}] User connected: ${socket.id}`);

//         // Prevent duplicate WebSocket upgrades
//         if (Object.values(onlineUsers).includes(socket.id)) {
//             console.warn(`[${new Date().toISOString()}] Duplicate socket connection detected: ${socket.id}`);
//             socket.disconnect(true); // Close duplicate connection
//             return;
//         }

//         // Handle user coming online
//         socket.on("user-online", async (userId) => {
//             if (onlineUsers[userId] && onlineUsers[userId] !== socket.id) {
//                 console.warn(`[${new Date().toISOString()}] User ${userId} already has an active connection. Closing previous connection.`);
//                 io.sockets.sockets.get(onlineUsers[userId])?.disconnect(true); // Close old socket
//             }
        
//             onlineUsers[userId] = socket.id;
//             console.log(`[${new Date().toISOString()}] User online: ${userId}, Socket ID: ${socket.id}`);
        
//             try {
//                 let user = await registerModel.findByIdAndUpdate(userId, { onlineStatus: true, lastOnline: new Date() });
        
//                 if (!user) {
//                     // If user not found in registerModel, check businessRegisterModel
//                     user = await businessRegisterModel.findByIdAndUpdate(userId, { onlineStatus: true, lastOnline: new Date() });
//                 }
        
//                 if (user) {
//                     await ChatMember.findOneAndUpdate({ userId }, { isOnline: true });
//                     await ChatMember.updateMany(
//                         { "player.playerId": userId },
//                         { $set: { "player.$.isOnline": true } }
//                     );
//                     io.emit("update-status", { userId, online: true });
//                 } else {
//                     console.warn(`[${new Date().toISOString()}] No user found in either registerModel or businessRegisterModel for userId: ${userId}`);
//                 }
//             } catch (error) {
//                 console.error(`[${new Date().toISOString()}] Error updating user online status:`, error);
//             }
//         });
        

//         // Fetch chat members
//         const chatMemberChange = ChatMember.watch();

//         socket.on("get-chat-members", async (userId) => {
//             try {
//                 const chatMembers = await ChatMember.find({ userId });
        
//                 if (!chatMembers.length) {
//                     console.warn(`[${new Date().toISOString()}] No chat members found for user ${userId}`);
//                     socket.emit("chat-members", []);
//                     return;
//                 }
        
//                 socket.emit("chat-members", chatMembers);
//                 console.log(`[${new Date().toISOString()}] Sent chat members for user ${userId}`);
//             } catch (error) {
//                 console.error(`[${new Date().toISOString()}] Error fetching chat members for user ${userId}:`, error);
//                 socket.emit("chat-members-error", "Error retrieving chat members.");
//             }
//         });
        
//         // Watch for changes in ChatMember and emit updates
//         chatMemberChange.on("change", async (change) => {
//             try {
//                 if (change.operationType === "update" || change.operationType === "insert") {
//                     console.log(`[${new Date().toISOString()}] Change detected in ChatMember`);

//                     // Fetch the document using _id
//                     const documentId = change.documentKey?._id;
//                     if (!documentId) {
//                         console.warn(`[${new Date().toISOString()}] No document ID found in change event.`);
//                         return;
//                     }

//                     const updatedDocument = await ChatMember.findById(documentId);
//                     if (!updatedDocument) {
//                         console.warn(`[${new Date().toISOString()}] No document found for ID: ${documentId}`);
//                         return;
//                     }

//                     const updatedUserId = updatedDocument.userId;
//                     if (!updatedUserId) {
//                         console.warn(`[${new Date().toISOString()}] No userId found in document for ID: ${documentId}`);
//                         return;
//                     }

//                     // Check if the update contains relevant fields
//                     if (change.operationType === "update") {
//                         const updatedFields = Object.keys(change.updateDescription.updatedFields || {});
//                         const relevantFields = [
//                             "name",
//                             "avatarUrl",
//                             "phoneNumber",
//                             "lastSeen",
//                             "isOnline",
//                             "player",
//                             "player.status",
//                             "player.isOnline",
//                             "player.lastSeen",
//                         ];

//                         // Check if any relevant field is a prefix of an updated field
//                         const isRelevantChange = updatedFields.some(field =>
//                             relevantFields.some(relevant => field.startsWith(relevant))
//                         );

//                         if (!isRelevantChange) {
//                             console.log(`[${new Date().toISOString()}] Ignoring update as no relevant fields changed.`);
//                             return;
//                         }
//                     }

//                     // Get the socket ID of the currently connected user
//                     const connectedSocketId = socket.id;
//                     const connectedUserId = Object.keys(onlineUsers).find(key => onlineUsers[key] === connectedSocketId);

//                     // Only emit update if the changed document matches the connected user
//                     if (connectedUserId === updatedUserId) {
//                         // Fetch updated chat members for the connected user
//                         const updatedChatMembers = await ChatMember.find({ userId: updatedUserId });

//                         // Emit update event only to the connected user's socket
//                         socket.emit(`chat-members-update`, updatedChatMembers);
//                         console.log(`[${new Date().toISOString()}] Emitted updated chat members for user ${updatedUserId}`);
//                     } else {
//                         console.log(`[${new Date().toISOString()}] Skipping update for different user. Connected: ${connectedUserId}, Updated: ${updatedUserId}`);
//                     }
//                 }
//             } catch (error) {
//                 console.error(`[${new Date().toISOString()}] Error processing chat member update:`, error);
//             }
//         });
        
        

//         // Handle typing
//         socket.on("user-typing", ({ senderId, receiverId }) => {
//             console.log(`[${new Date().toISOString()}] User typing: Sender: ${senderId}, Receiver: ${receiverId}`);

//             if (onlineUsers[receiverId]) {
//                 io.to(onlineUsers[receiverId]).emit("typing", { senderId });
//             } else {
//                 console.warn(`[${new Date().toISOString()}] Receiver ${receiverId} is not online.`);
//             }
//         });

//         // Handle stop typing
//         socket.on("user-stop-typing", ({ senderId, receiverId }) => {
//             console.log(`[${new Date().toISOString()}] User stopped typing: Sender: ${senderId}, Receiver: ${receiverId}`);

//             if (onlineUsers[receiverId]) {
//                 io.to(onlineUsers[receiverId]).emit("stop-typing", { senderId });
//             } else {
//                 console.warn(`[${new Date().toISOString()}] Receiver ${receiverId} is not online.`);
//             }
//         });

//         // **Listen for database changes in Friend collection**
//         const friendChangeStream = Friend.watch();
//         friendChangeStream.on("change", async (change) => { // ✅ Correct async placement
//             console.log(`[${new Date().toISOString()}] Change detected in friend collection:`, change);
        
//             if (change.operationType === "update") {
//                 try {
//                     const id = change.documentKey._id;
//                     const updatedUser = await Friend.findById(id);
                    
//                     if (!updatedUser) {
//                         console.warn(`No user found with ID: ${id}`);
//                         return;
//                     }
        
//                     const updatedUserId = updatedUser.userId; // Assuming 'userId' exists
//                     console.log(`[${new Date().toISOString()}] Update operation detected for user ID: ${updatedUserId}`);
        
//                     // Extract modified fields
//                     const updatedFields = change.updateDescription.updatedFields;
//                     console.log(`[${new Date().toISOString()}] Updated fields:`, updatedFields);
                    
//                     const isFriendsUpdated = Object.keys(updatedFields).some(field => field.startsWith("friends."));
//                     console.log(`[${new Date().toISOString()}] Is friends list updated: ${isFriendsUpdated}`);
        
//                     if (isFriendsUpdated) {
//                         console.log(`[${new Date().toISOString()}] Friends list updated for user ID: ${updatedUserId}`);
//                         console.log(`Online users:`, onlineUsers);
        
//                         // Notify the user about updated friend requests
//                         const socketId = onlineUsers[updatedUserId];
        
//                         if (socketId) {
//                             console.log(`[${new Date().toISOString()}] Sending friend-list-updated event to socket ID: ${socketId}`);
//                             io.to(socketId).emit("friend-list-updated", updatedFields["friends"]);
//                         } else {
//                             console.log(`[${new Date().toISOString()}] User ID ${updatedUserId} is not online. Skipping notification.`);
//                         }
//                     } else {
//                         console.log(`[${new Date().toISOString()}] No changes in friends list for user ID: ${updatedUserId}`);
//                     }
//                 } catch (error) {
//                     console.error(`[${new Date().toISOString()}] Error processing friend update:`, error);
//                 }
//             } else {
//                 console.log(`[${new Date().toISOString()}] Ignoring non-update operation type: ${change.operationType}`);
//             }
//         });
        
        
    
//         friendChangeStream.on("error", (error) => {
//             console.error(`[${new Date().toISOString()}] Change Stream Error:`, error);
//         });
        

//         // Handle disconnection
//         socket.on("disconnect", async () => {
//             let userId = Object.keys(onlineUsers).find((key) => onlineUsers[key] === socket.id);
        
//             if (userId) {
//                 console.log(`[${new Date().toISOString()}] User disconnected: ${userId}, Socket ID: ${socket.id}`);
        
//                 delete onlineUsers[userId];
        
//                 try {
//                     let user = await registerModel.findByIdAndUpdate(userId, { onlineStatus: false, lastOnline: new Date() });
//                     const lastSeen = new Date();
//                     if (!user) {
//                         // If not found in registerModel, check businessRegisterModel
//                         user = await businessRegisterModel.findByIdAndUpdate(userId, { onlineStatus: false, lastOnline: new Date() });
//                     }

//                     await ChatMember.findOneAndUpdate({ userId }, { isOnline: false, lastSeen });
//                     await ChatMember.updateMany(
//                         { "player.playerId": userId },
//                         { $set: { "player.$.isOnline": false, "player.$.lastSeen": lastSeen } }
//                     );
        
//                     if (user) {
//                         io.emit("update-status", { userId, online: false });
//                     } else {
//                         console.warn(`[${new Date().toISOString()}] No user found in either registerModel or businessRegisterModel for userId: ${userId}`);
//                     }
//                 } catch (error) {
//                     console.error(`[${new Date().toISOString()}] Error updating user offline status:`, error);
//                 }
//             } else {
//                 console.warn(`[${new Date().toISOString()}] Unknown user disconnected: Socket ID: ${socket.id}`);
//             }
//         });
        
//     });
// };

// export default chatSocket;
import { handleUserOnline,handleUserOffline } from './userHandlers.js';
import { setupFriendChangeStream } from './friendHandlers.js';
import { setupStatusChangeStream } from './chatMessageStatusHandler.js';
import { setupChatMemberChangeStream } from './chatMemberHandlers.js';
import { setupChatMessageChangeStream } from './setupChatMessageChangeStream.js';
import { handleTyping, handleStopTyping } from './typingHandlers.js';

let onlineUsers = {};

const chatSocket = (io) => {
    io.on("connection", (socket) => {
        console.log(`[${new Date().toISOString()}] User connected: ${socket.id}`);

        // Prevent duplicate WebSocket upgrades
        if (Object.values(onlineUsers).includes(socket.id)) {
            console.warn(`[${new Date().toISOString()}] Duplicate socket connection detected: ${socket.id}`);
            socket.disconnect(true);
            return;
        }

        // User Online Handler
        socket.on("user-online", async (userId) => {
            await handleUserOnline(io, socket, onlineUsers, userId);
        });

        // Setup Friend Change Stream
        setupFriendChangeStream(io, onlineUsers);

        // Setup Chat Member Change Stream
        setupChatMemberChangeStream(socket, onlineUsers);

        // Setup Chat Member Change Stream
        setupChatMessageChangeStream(socket, onlineUsers);

        // Setup Chat Message Change Stream
        setupStatusChangeStream(socket, onlineUsers);

        // Typing Handlers
        socket.on("user-typing", ({ senderId, receiverId }) => {
            handleTyping(io, onlineUsers, senderId, receiverId);
        });

        socket.on("user-stop-typing", ({ senderId, receiverId }) => {
            handleStopTyping(io, onlineUsers, senderId, receiverId);
        });

        // Handle disconnection
        socket.on("disconnect", async () => {
            const userId = Object.keys(onlineUsers).find((key) => onlineUsers[key] === socket.id);
            
            if (userId) {
                console.log(`[${new Date().toISOString()}] User disconnected: ${userId}, Socket ID: ${socket.id}`);
                delete onlineUsers[userId];

                try {
                    await handleUserOffline(io, userId);
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