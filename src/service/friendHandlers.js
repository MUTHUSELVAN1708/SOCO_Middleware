import Friend from "../model/FriendModel.js";

export const setupFriendChangeStream = (io, onlineUsers) => {
    const friendChangeStream = Friend.watch();
    
    friendChangeStream.on("change", async (change) => {
        console.log(`[${new Date().toISOString()}] Change detected in friend collection:`, change);
    
        if (change.operationType === "update") {
            try {
                const id = change.documentKey._id;
                const updatedUser = await Friend.findById(id);
                
                if (!updatedUser) {
                    console.warn(`No user found with ID: ${id}`);
                    return;
                }
    
                const updatedUserId = updatedUser.userId;
                console.log(`[${new Date().toISOString()}] Update operation detected for user ID: ${updatedUserId}`);
    
                const updatedFields = change.updateDescription.updatedFields;
                console.log(`[${new Date().toISOString()}] Updated fields:`, updatedFields);
                
                const isFriendsUpdated = Object.keys(updatedFields).some(field => field.startsWith("friends."));
                console.log(`[${new Date().toISOString()}] Is friends list updated: ${isFriendsUpdated}`);
    
                if (isFriendsUpdated) {
                    console.log(`[${new Date().toISOString()}] Friends list updated for user ID: ${updatedUserId}`);
                    console.log(`Online users:`, onlineUsers);
    
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
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Error processing friend update:`, error);
            }
        } else {
            console.log(`[${new Date().toISOString()}] Ignoring non-update operation type: ${change.operationType}`);
        }
    });
    
    friendChangeStream.on("error", (error) => {
        console.error(`[${new Date().toISOString()}] Change Stream Error:`, error);
    });
};