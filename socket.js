// import { Server } from "socket.io"; // Use named import instead of default
// import adminService from "./src/service/adminService.js";

// const initializeSocket = (server) => {
//     const io = new Server(server, {
//         cors: {
//             origin: "*", // Allowed origins
//             methods: ["GET", "POST"], // Allowed HTTP methods
//             credentials: true, // Allow credentials (e.g., cookies, headers)
//         },
//     });

//     const connectedUsers = {};

//     io.on("connection", (socket) => {
//         console.log("A user connected:", socket.id);

//         // Handle user registration
//         socket.on("registerUser", (userId) => {
//             if (userId) {
//                 connectedUsers[userId] = socket.id;
//                 console.log(`User registered: ${userId} (Socket ID: ${socket.id})`);
//             } else {
//                 console.log("Invalid user ID for registration.");
//             }
//         }),
//         socket.on("joinRoom", (userId) => {
//             socket.join(userId);
//             console.log(`User ${userId} joined room ${userId}`);
//         });
    

//             socket.on("addMention", async (data) => {
//                 console.log("Received addMention event with data:", data);

//                 try {
//                     const result = await adminService.addMention(data);
//                     console.log(result, "result")
//                     socket.emit("addMentionResult", result);
//                 } catch (error) {
//                     console.error("Error in addMention event:", error.message);

//                     socket.emit("addMentionResult", {
//                         success: false,
//                         message: "An error occurred while adding mention",
//                         error: error.message,
//                     });
//                 }
//             });


//         socket.on("getPendingStatus", async () => {
//             console.log("Received getPendingStatus event");
//             try {
//                 const result = await adminService.getPendingStatus();
//                 console.log("Fetched pending status:", result);
//                 socket.emit("pendingStatusResult", { success: true, data: result });
//             } catch (error) {
//                 console.error("Error in getPendingStatus event:", error.message);
//                 socket.emit("pendingStatusResult", { success: false, message: error.message });
//             }
//         }),

     

//         socket.on("sendMsg", async (data) => {
//             console.log("Raw Data Received:", data);
        
//             if (typeof data === "string") {
//                 try {
//                     data = JSON.parse(data);
//                 } catch (error) {
//                     console.error("Error parsing JSON data:", error.message);
//                     socket.emit("sendedMsg", { success: false, message: "Invalid JSON format" });
//                     return;
//                 }
//             }
//             if (!data || typeof data !== "object") {
//                 console.error("Invalid data format received:", data);
//                 socket.emit("sendedMsg", { success: false, message: "Invalid data format" });
//                 return;
//             }
        
//             const { from, to, message } = data;
//             console.log("Extracted Data:", { from, to, message });
        
//             try {
//                 await adminService.sendMessage(socket, from, to, message);
//             } catch (error) {
//                 console.error("Error in sendMsg:", error.message);
//                 socket.emit("sendedMsg", { success: false, message: error.message });
//             }
//         });
        


//         // Handle disconnection
//         socket.on("disconnect", () => {
//             console.log("User disconnected:", socket.id);

//             // Remove disconnected user
//             for (const userId in connectedUsers) {
//                 if (connectedUsers[userId] === socket.id) {
//                     delete connectedUsers[userId];
//                     break;
//                 }
//             }
//         });
//     });

//     return io;
// };

// export default initializeSocket;




import { Server } from "socket.io"; 
import adminService from "./src/service/adminService.js";
import redisService from "./src/service/redisService.js";

const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    const connectedUsers = {}; 

    io.on("connection", (socket) => {
        console.log(" New user connected:", socket.id);

        socket.on("registerUser", async (userId) => {
            if (userId) {
                connectedUsers[userId] = socket.id;
                console.log(`User registered: ${userId} (Socket ID: ${socket.id})`);
        
                const offlineMessages = await redisService.getRedisClient().lRange(`offlineMessages:${userId}`, 0, -1);
                
                if (offlineMessages.length > 0) {
                    console.log(`Sending ${offlineMessages.length} offline messages to ${userId}`);
        
                    offlineMessages.forEach((msg) => {
                        socket.emit("receiveMsg", JSON.parse(msg));
                    });
        
                    await redisService.getRedisClient().del(`offlineMessages:${userId}`);
                }
            } else {
                console.log("Invalid user ID for registration.");
            }
        });
        
        socket.on("joinRoom", (userId) => {
            socket.join(userId);
            console.log(` User ${userId} joined room ${userId}`);
        });

        socket.on("sendMsg", async (data) => {
            console.log("📩 Received message data:", data);

            if (typeof data === "string") {
                try {
                    data = JSON.parse(data);
                } catch (error) {
                    console.error(" Error parsing JSON:", error.message);
                    socket.emit("sendedMsg", { success: false, message: "Invalid JSON format" });
                    return;
                }
            }

            if (!data || typeof data !== "object") {
                console.error(" Invalid data format:", data);
                socket.emit("sendedMsg", { success: false, message: "Invalid data format" });
                return;
            }

            const { from, to, message } = data;
            console.log(" Extracted Data:", { from, to, message });

            try {
                await adminService.sendMessage(io, socket, from, to, message); 
            } catch (error) {
                console.error(" Error in sendMsg:", error.message);
                socket.emit("sendedMsg", { success: false, message: error.message });
            }
        });

        socket.on("disconnect", () => {
            console.log(" User disconnected:", socket.id);
            
            // Remove disconnected user from `connectedUsers`
            for (const userId in connectedUsers) {
                if (connectedUsers[userId] === socket.id) {
                    delete connectedUsers[userId];
                    console.log(`🚫 Removed user ${userId} from connected list.`);
                    break;
                }
            }
        });
    });

    return io;
};

export default initializeSocket;
