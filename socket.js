// import { Server } from "socket.io";
// import adminService from "./src/service/adminService.js";
// import redisService from "./src/service/redisService.js";
// const connectedUsers = {};

// const initializeSocket = (server) => {
//     const io = new Server(server, {
//         cors: {
//             origin: "*",
//             methods: ["GET", "POST"],
//             credentials: true,
//         },
//     });

//     io.on("connection", (socket) => {
//         console.log("New user connected:", socket.id);

//         socket.on("registerUser", async (data) => {
//             let userId;
//             try {
//                 userId = typeof data === "string" ? JSON.parse(data).userId : data.userId;
//             } catch (error) {
//                 console.log("Error parsing userId:", error);
//                 return;
//             }

//             if (userId) {
//                 connectedUsers[userId] = socket.id;
//                 console.log(`User registered: ${userId} (Socket ID: ${socket.id})`);
//                 console.log(" Updated Connected Users:", JSON.stringify(connectedUsers, null, 2));


//                 await redisService.getRedisClient().hSet("connectedUsers", userId, socket.id);
//             } else {
//                 console.log("Invalid user ID for registration.");
//             }
//         });

//         socket.on("sendMsg", async (data) => {
//             console.log("Received message data:", data);

//             if (typeof data === "string") {
//                 try {
//                     data = JSON.parse(data);
//                 } catch (error) {
//                     console.error(" Error parsing JSON:", error.message);
//                     socket.emit("sendedMsg", { success: false, message: "Invalid JSON format" });
//                     return;
//                 }
//             }

//             if (!data || typeof data !== "object") {
//                 console.error(" Invalid data format:", data);
//                 socket.emit("sendedMsg", { success: false, message: "Invalid data format" });
//                 return;
//             }

//             const { from, to, message } = data;
//             console.log(" Extracted Data:", { from, to, message });
//             console.log(" Current connected users:", JSON.stringify(connectedUsers, null, 2));

//             if (!connectedUsers[to]) {
//                 console.log(` Receiver (${to}) is not online. Storing message in Redis.`);
//                 await redisService.getRedisClient().rPush(`offlineMessages:${to}, JSON.stringify({ from, message })`);
//                 return;
//             }

//             try {
//                 await adminService.sendMessage(io, socket, from, to, message);
//             } catch (error) {
//                 console.error(" Error in sendMsg:", error.message);
//                 socket.emit("sendedMsg", { success: false, message: error.message });
//             }
//         });
//         socket.on("getUser", async (data) => {
//             console.log("Received data in socket:", data);
//             console.log("Type of data:", typeof data);
        
//             let parsedData;
//             try {
//                 parsedData = typeof data === "string" ? JSON.parse(data) : data; 
//             } catch (error) {
//                 console.error("Error parsing JSON:", error.message);
//                 socket.emit("fetchedAlluser", { success: false, message: "Invalid JSON format" });
//                 return;
//             }
        
//             const user_id = parsedData?.user_id?.toString(); 
//             console.log("Extracted user_id:", user_id);
//             console.log("Type of user_id:", typeof user_id);
        
//             if (!user_id || user_id === "undefined") {
//                 console.error(" Error: user_id is invalid or undefined");
//                 socket.emit("fetchedAlluser", { success: false, message: "Invalid user_id" });
//                 return;
//             }
        
//             try {
//                 const response = await adminService.getAllUser(user_id);
//                 console.log(" Socket Response:", response);
//                 socket.emit("fetchedAlluser", { success: true, data: response });
//             } catch (error) {
//                 console.error(" Error in getUser:", error.message);
//                 socket.emit("fetchedAlluser", { success: false, message: error.message });
//             }
//         });
        
        


//         socket.on("typing", (data) => {
//             console.log("Typing event received. Raw Data:", data);
//             console.log("Type of received data:", typeof data);

//             if (typeof data === "string") {
//                 try {
//                     data = JSON.parse(data);
//                 } catch (error) {
//                     console.log(" Error parsing typing event:", error.message);
//                     return;
//                 }
//             }
//             if (!data) {
//                 console.log("Error: 'data' is undefined or null.");
//                 return;
//             }

//             console.log("Extracted `to`: ", data.to);

//             if (typeof data.to === "undefined") {
//                 console.log("Error: 'to' field is missing in typing event.");
//                 return;
//             }

//             console.log(" Connected users:", JSON.stringify(connectedUsers, null, 2));

//             const receiverSocketId = connectedUsers[data.to];
//             console.log(" Receiver Socket ID:", receiverSocketId);

//             if (receiverSocketId) {
//                 io.to(receiverSocketId).emit("userTyping", { from: data.from });
//             }
//         });


//         socket.on("disconnect", async () => {
//             console.log(" User disconnected:", socket.id);

//             for (const userId in connectedUsers) {
//                 if (connectedUsers[userId] === socket.id) {
//                     delete connectedUsers[userId];
//                     console.log(` Removed user ${userId} from connected list.`);


//                     await redisService.getRedisClient().hDel("connectedUsers", userId);
//                     break;
//                 }
//             }
//         });
//     });

//     return io;
// };

// export { connectedUsers, initializeSocket }; 




import { Server } from "socket.io";
import adminService from "./src/service/adminService.js";
import redisService from "./src/service/redisService.js";
import mongoose from "mongoose";

const connectedUsers = {};
let io;
const initializeSocket = (server) => {
    io = new Server(server, {  // ✅ Assign to global io instead of creating a new local variable
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });


    io.on("connection", (socket) => {
        console.log("New user connected:", socket.id);

        socket.on("registerUser", async (data) => {
            let userId;
        
            try {
                if (typeof data === "string") {
                    data = JSON.parse(data); // Parse only if it's a string
                }
        
                if (!data || !data.userId) {
                    console.log("Invalid user data received:", data);
                    return;
                }
        
                // Convert to ObjectId
                userId = new mongoose.Types.ObjectId(data.userId);
        
                connectedUsers[userId] = socket.id;
                console.log(`User registered: ${userId} (Socket ID: ${socket.id})`);
        
                // Store in Redis
                await redisService.getRedisClient().hSet("connectedUsers", userId.toString(), socket.id);
        
                // Set user online
                await redisService.getRedisClient().hSet("userStatus", userId.toString(), "online");
        
                // Broadcast user is online
                io.emit("userStatus", { userId: userId.toString(), status: "online" });
        
            } catch (error) {
                console.log("Error parsing userId:", error);
            }
        }); 
        

        socket.on("sendMsg", async (data) => {
            console.log("Received message data:", data);

            if (typeof data === "string") {
                try {
                    data = JSON.parse(data);
                } catch (error) {
                    console.error("Error parsing JSON:", error.message);
                    socket.emit("sendedMsg", { success: false, message: "Invalid JSON format" });
                    return;
                }
            }

            if (!data || typeof data !== "object") {
                console.error("Invalid data format:", data);
                socket.emit("sendedMsg", { success: false, message: "Invalid data format" });
                return;
            }

            const { from, to, message } = data;
            console.log("Extracted Data:", { from, to, message });
            console.log("Current connected users:", JSON.stringify(connectedUsers, null, 2));

            if (!connectedUsers[to]) {
                console.log(`Receiver (${to}) is not online. Storing message in Redis.`);
                await redisService.getRedisClient().rPush(`offlineMessages:${to}`, JSON.stringify({ from, message }));
                return;
            }

            try {
                await adminService.sendMessage(io, socket, from, to, message);
            } catch (error) {
                console.error("Error in sendMsg:", error.message);
                socket.emit("sendedMsg", { success: false, message: error.message });
            }
        });

        socket.on("friendRequestAccepted", async (data) => {
            console.log("Friend request accepted. Updating chat users list:", data);

            let parsedData;
            try {
                parsedData = typeof data === "object" ? data : JSON.parse(data);  
            } catch (error) {
                console.error("Error parsing JSON:", error.message);
                socket.emit("fetchedAlluser", { success: false, message: "Invalid JSON format" });
                return;
            }
            
            const user_id = parsedData?.userId?.toString();  // Corrected key name
            
            console.log("Extracted user_id:", user_id);
            
            if (!user_id || user_id === "undefined") {
                console.error("Error: user_id is invalid or undefined");
                socket.emit("fetchedAlluser", { success: false, message: "Invalid user_id" });
                return;
            }
            

           
            
                try {
                    // Fetch updated user list
                    const updatedUsers = await adminService.getAllUser(user_id);
                    
                    // Emit updated user list to all users in chat
                    io.emit("fetchedAlluser", { success: true, data: updatedUsers });
                } catch (error) {
                    console.error("Error updating chat users:", error.message);
                    socket.emit("fetchedAlluser", { success: false, message: error.message });
                }
            });
            

        socket.on("typing", (data) => {
            console.log("Typing event received. Raw Data:", data);

            if (typeof data === "string") {
                try {
                    data = JSON.parse(data);
                } catch (error) {
                    console.log("Error parsing typing event:", error.message);
                    return;
                }
            }

            if (!data) {
                console.log("Error: 'data' is undefined or null.");
                return;
            }

            console.log("Extracted `to`: ", data.to);

            if (typeof data.to === "undefined") {
                console.log("Error: 'to' field is missing in typing event.");
                return;
            }

            console.log("Connected users:", JSON.stringify(connectedUsers, null, 2));

            const receiverSocketId = connectedUsers[data.to];
            console.log("Receiver Socket ID:", receiverSocketId);

            if (receiverSocketId) {
                io.to(receiverSocketId).emit("userTyping", { from: data.from });
            }
        });

        socket.on("disconnect", async () => {
            console.log("User disconnected:", socket.id);

            for (const userId in connectedUsers) {
                if (connectedUsers[userId] === socket.id) {
                    delete connectedUsers[userId];
                    console.log(`Removed user ${userId} from connected list.`);

                    await redisService.getRedisClient().hDel("connectedUsers", userId);
                    await redisService.getRedisClient().hSet("userStatus", userId, "offline");

                    // Broadcast user is offline
                    io.emit("userStatus", { userId, status: "offline" });

                    break;
                }
            }
        });
    });


    

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

export { connectedUsers, initializeSocket };
