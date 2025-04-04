import ChatMessageModel from "../model/ChatMessageModel.js";

export const setupChatMessageChangeStream = (socket, onlineUsers) => {
    const chatMessageChangeStream = ChatMessageModel.watch();

    socket.on("get-chat-messages", async (userId) => {
        console.warn(`[${new Date().toISOString()}] Event received: get-chat-messages`);
        console.warn(`[${new Date().toISOString()}] Socket ID (User ID): ${socket.id}, Target User ID: ${userId}`);
    
        try {
            console.log(`[${new Date().toISOString()}] Fetching messages where receiverId matches ${userId}`);
    
            // Fetch messages where receiverId matches userId and filter out deleted or locally stored messages
            const messages = await ChatMessageModel.find({
                receiverId: userId,
                isDeleted: false,
                isStoredLocally: false
            }).sort({ timestamp: 1 });
    
            if (!messages.length) {
                console.warn(`[${new Date().toISOString()}] No messages found where receiverId = ${userId}`);
            } else {
                console.log(`[${new Date().toISOString()}] Found ${messages.length} messages with receiverId = ${userId}`);
            }
    
            // Emit filtered messages to the requesting client
            socket.emit("chat-messages", messages);
            console.log(`[${new Date().toISOString()}] Sent chat messages for receiverId = ${userId}`);
    
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error fetching chat messages:`, error);
            socket.emit("chat-messages-error", "Error retrieving chat messages.");
        }
    });


    socket.on("update-stored-locally", async (messageIds) => {
        console.log(`[${new Date().toISOString()}] Raw received messageIds:`, messageIds);
        console.log(`[${new Date().toISOString()}] Type of messageIds:`, typeof messageIds);
    
        try {
            // Handle if the received data is a stringified JSON array
            if (typeof messageIds === "string") {
                try {
                    messageIds = JSON.parse(messageIds);
                } catch (error) {
                    console.error(`[${new Date().toISOString()}] Error parsing messageIds JSON:`, error);
                    return;
                }
            }
    
            // Ensure messageIds is an array
            if (!Array.isArray(messageIds)) {
                console.warn(`[${new Date().toISOString()}] Received invalid messageIds format.`);
                return;
            }
    
            if (messageIds.length === 0) {
                console.warn(`[${new Date().toISOString()}] Received an empty messageIds list.`);
                return;
            }
    
            console.log(`[${new Date().toISOString()}] Updating isStoredLocally status for ${messageIds.length} messages.`);
    
            await ChatMessageModel.updateMany(
                { _id: { $in: messageIds } },
                { $set: { isStoredLocally: true } }
            );
    
            console.log(`[${new Date().toISOString()}] Successfully updated isStoredLocally for ${messageIds.length} messages.`);
    
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error updating isStoredLocally status:`, error);
        }
    });
    
    
    
    

    chatMessageChangeStream.on("change", async (change) => {
        try {
            if (change.operationType === "insert" || change.operationType === "update") {
                console.log(`[${new Date().toISOString()}] Change detected in ChatMessage`);
    
                const documentId = change.documentKey?._id;
                if (!documentId) {
                    console.warn(`[${new Date().toISOString()}] No document ID found in change event.`);
                    return;
                }
    
                const updatedMessage = await ChatMessageModel.findById(documentId);
                if (!updatedMessage) {
                    console.warn(`[${new Date().toISOString()}] No document found for ID: ${documentId}`);
                    return;
                }
    
                const eventType = change.operationType === "insert" ? "chat-message-insert" : "chat-message-update";
                socket.emit(eventType, updatedMessage);
                console.log(`[${new Date().toISOString()}] Emitted ${eventType} for ID: ${documentId}`);
            }
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error processing chat message update:`, error);
        }
    });
    
};
