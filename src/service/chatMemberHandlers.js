import ChatMember from "../model/chatMembers.js";

export const setupChatMemberChangeStream = (socket, onlineUsers) => {
    const chatMemberChange = ChatMember.watch();

    socket.on("get-chat-members", async (userId) => {
        try {
            const chatMembers = await ChatMember.find({ userId });
    
            if (!chatMembers.length) {
                console.warn(`[${new Date().toISOString()}] No chat members found for user ${userId}`);
                socket.emit("chat-members", []);
                return;
            }
    
            socket.emit("chat-members", chatMembers);
            console.log(`[${new Date().toISOString()}] Sent chat members for user ${userId}`);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error fetching chat members for user ${userId}:`, error);
            socket.emit("chat-members-error", "Error retrieving chat members.");
        }
    });

    chatMemberChange.on("change", async (change) => {
        try {
            if (change.operationType === "update" || change.operationType === "insert") {
                console.log(`[${new Date().toISOString()}] Change detected in ChatMember`);

                const documentId = change.documentKey?._id;
                if (!documentId) {
                    console.warn(`[${new Date().toISOString()}] No document ID found in change event.`);
                    return;
                }

                const updatedDocument = await ChatMember.findById(documentId);
                if (!updatedDocument) {
                    console.warn(`[${new Date().toISOString()}] No document found for ID: ${documentId}`);
                    return;
                }

                const updatedUserId = updatedDocument.userId;
                if (!updatedUserId) {
                    console.warn(`[${new Date().toISOString()}] No userId found in document for ID: ${documentId}`);
                    return;
                }

                if (change.operationType === "update") {
                    const updatedFields = Object.keys(change.updateDescription.updatedFields || {});
                    const relevantFields = [
                        "name", "avatarUrl", "phoneNumber", "lastSeen",
                        "isOnline", "player", "player.status", 
                        "player.isOnline", "player.lastSeen"
                    ];

                    const isRelevantChange = updatedFields.some(field =>
                        relevantFields.some(relevant => field.startsWith(relevant))
                    );

                    if (!isRelevantChange) {
                        console.log(`[${new Date().toISOString()}] Ignoring update as no relevant fields changed.`);
                        return;
                    }
                }

                const connectedSocketId = socket.id;
                const connectedUserId = Object.keys(onlineUsers).find(key => onlineUsers[key] === connectedSocketId);
                const updatedChatMembers = await ChatMember.find({ userId: updatedUserId });
                socket.emit(`chat-members-update`, updatedChatMembers);
                if (connectedUserId === updatedUserId) {
                    
                    
                    console.log(`[${new Date().toISOString()}] Emitted updated chat members for user ${updatedUserId}`);
                } else {
                    console.log(`[${new Date().toISOString()}] Skipping update for different user. Connected: ${connectedUserId}, Updated: ${updatedUserId}`);
                }
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error processing chat member update:`, error);
        }
    });
};