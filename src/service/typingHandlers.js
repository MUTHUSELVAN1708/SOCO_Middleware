export const handleTyping = (io, onlineUsers, senderId, receiverId) => {
    console.log(`[${new Date().toISOString()}] User typing: Sender: ${senderId}, Receiver: ${receiverId}`);

    if (onlineUsers[receiverId]) {
        io.to(onlineUsers[receiverId]).emit("typing", { senderId });
    } else {
        console.warn(`[${new Date().toISOString()}] Receiver ${receiverId} is not online.`);
    }
};

export const handleStopTyping = (io, onlineUsers, senderId, receiverId) => {
    console.log(`[${new Date().toISOString()}] User stopped typing: Sender: ${senderId}, Receiver: ${receiverId}`);

    if (onlineUsers[receiverId]) {
        io.to(onlineUsers[receiverId]).emit("stop-typing", { senderId });
    } else {
        console.warn(`[${new Date().toISOString()}] Receiver ${receiverId} is not online.`);
    }
};