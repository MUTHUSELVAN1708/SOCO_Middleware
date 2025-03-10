import { Server } from "socket.io";
import http from "http";
import businessregisterModel from "../model/BusinessModel.js";

// Store active connections
const activeConnections = new Map();

export const initializeSocketServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // Configure according to your security needs
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Client authenticates with user/seller ID
    socket.on("authenticate", async (data) => {
      const { id, type } = data;
      if (id) {
        // Store connection info
        activeConnections.set(id, { socket, type });
        console.log(`${type} authenticated: ${id}`);
        
        // Update online status for seller
        if (type === "seller") {
          await businessregisterModel.findByIdAndUpdate(id, {
            onlineStatus: true,
            lastOnline: new Date()
          });
        }
      }
    });

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log("Client disconnected:", socket.id);
      
      // Find the user/seller ID associated with this socket
      for (const [id, conn] of activeConnections.entries()) {
        if (conn.socket === socket) {
          activeConnections.delete(id);
          
          // Update seller status if it's a seller
          if (conn.type === "seller") {
            await businessregisterModel.findByIdAndUpdate(id, {
              onlineStatus: false,
              lastOnline: new Date()
            });
          }
          break;
        }
      }
    });
  });

  return io;
};

// Function to send notification to a specific user/seller
export const sendNotification = async (recipient_id, notification) => {
  const connection = activeConnections.get(recipient_id);
  
  if (connection) {
    connection.socket.emit("notification", notification);
    return true;
  }
  return false;
};