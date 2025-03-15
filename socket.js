

import { Server } from "socket.io"; 
import adminService from "./src/service/adminService.js";
import redisService from "./src/service/redisService.js";
const connectedUsers = {}; 

const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        console.log("🔌 New user connected:", socket.id);

        socket.on("registerUser", async (data) => {
            let userId;
            try {
                userId = typeof data === "string" ? JSON.parse(data).userId : data.userId;
            } catch (error) {
                console.log("Error parsing userId:", error);
                return;
            }

            if (userId) {
                connectedUsers[userId] = socket.id;
                console.log(`User registered: ${userId} (Socket ID: ${socket.id})`);
                console.log(" Updated Connected Users:", JSON.stringify(connectedUsers, null, 2));

          
                await redisService.getRedisClient().hSet("connectedUsers", userId, socket.id);
            } else {
                console.log("Invalid user ID for registration.");
            }
        });

        socket.on("sendMsg", async (data) => {
            console.log("Received message data:", data);

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
            console.log(" Current connected users:", JSON.stringify(connectedUsers, null, 2)); 

            if (!connectedUsers[to]) {
                console.log(` Receiver (${to}) is not online. Storing message in Redis.`);
                await redisService.getRedisClient().rPush(`offlineMessages:${to}, JSON.stringify({ from, message })`);
                return;
            }

            try {
                await adminService.sendMessage(io, socket, from, to, message);
            } catch (error) {
                console.error(" Error in sendMsg:", error.message);
                socket.emit("sendedMsg", { success: false, message: error.message });
            }
        });

        socket.on("typing", (data) => {
            console.log("Typing event received. Raw Data:", data); 
            console.log("Type of received data:", typeof data);
        
    if (typeof data === "string") {
        try {
            data = JSON.parse(data);
        } catch (error) {
            console.log(" Error parsing typing event:", error.message);
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
        
            console.log(" Connected users:", JSON.stringify(connectedUsers, null, 2));
        
            const receiverSocketId = connectedUsers[data.to];
            console.log(" Receiver Socket ID:", receiverSocketId);
        
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("userTyping", { from: data.from });
            }
        });
        

        socket.on("disconnect", async () => {
            console.log(" User disconnected:", socket.id);

            for (const userId in connectedUsers) {
                if (connectedUsers[userId] === socket.id) {
                    delete connectedUsers[userId];
                    console.log(` Removed user ${userId} from connected list.`);
                    
                  
                    await redisService.getRedisClient().hDel("connectedUsers", userId);
                    break;
                }
            }
        });
    });

    return io;
};

export { connectedUsers, initializeSocket }; 
