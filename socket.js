import { Server } from "socket.io"; // Use named import instead of default
import adminService from "./src/service/adminService.js";

const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: ["http://example.com", "http://localhost:3000"], // Allowed origins
            methods: ["GET", "POST"], // Allowed HTTP methods
            credentials: true, // Allow credentials (e.g., cookies, headers)
        },
    });

    const connectedUsers = {};

    io.on("connection", (socket) => {
        console.log("A user connected:", socket.id);

        // Handle user registration
        socket.on("registerUser", (userId) => {
            if (userId) {
                connectedUsers[userId] = socket.id;
                console.log(`User registered: ${userId} (Socket ID: ${socket.id})`);
            } else {
                console.log("Invalid user ID for registration.");
            }
        }),


        socket.on("addMention", async (data) => {
            console.log("Received addMention event with data:", data);
        
            try {
                const result = await adminService.addMention(data);
        
                // Emit the result back to the client
                socket.emit("addMentionResult", result);
            } catch (error) {
                console.error("Error in addMention event:", error.message);
        
                // Emit error response back to the client
                socket.emit("addMentionResult", {
                    success: false,
                    message: "An error occurred while adding mention",
                    error: error.message,
                });
            }
        });
        

        socket.on("getPendingStatus", async () => {
            console.log("Received getPendingStatus event"); // Debug log
            try {
                const result = await adminService.getPendingStatus();
                console.log("Fetched pending status:", result); // Debug log
                socket.emit("pendingStatusResult", { success: true, data: result });
            } catch (error) {
                console.error("Error in getPendingStatus event:", error.message);
                socket.emit("pendingStatusResult", { success: false, message: error.message });
            }
        }) ,

        // Handle disconnection
        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);

            // Remove disconnected user
            for (const userId in connectedUsers) {
                if (connectedUsers[userId] === socket.id) {
                    delete connectedUsers[userId];
                    break;
                }
            }
        });
    });

    return io;
};

export default initializeSocket;
