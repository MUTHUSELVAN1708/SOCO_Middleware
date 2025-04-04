import express from "express";
import http from "http";
import cors from "cors";
import os from "os";
import "dotenv/config";
import { fileURLToPath } from "url";
import path from "path";
import { Server } from "socket.io";

import "./src/db/db.js"; 
import adminRouter from "./src/router/adminRouter.js";
import commonRouter from "./src/router/commonRouter.js";
import productRoutes from "./src/router/productRoutes.js";
import commentRoutes from "./src/router/commentRoutes.js";
import feedRoutes from "./src/router/feedRouter.js";
import playlistsRoutes from "./src/router/playlistRoutes.js";
import orderRoutes from "./src/router/orderRoutes.js";
import PreferenceRouter from "./src/router/PreferenceRouter.js";
import chatMessageRoutes from "./src/router/chatMessageRoutes.js";
import linkAccountRoutes from "./src/router/linkAccountRouters.js";
import errorHandling from "./errorHandling.js";
// import  {initializeSocket} from "./socket.js";
import chatSocket from "./src/service/chatSocket.js";
// import redisService from "./src/service/redisService.js";

const app = express();


app.use(cors());
app.use(express.json({ limit: '20mb' })); 
app.use(express.urlencoded({ extended: true })); 
app.use(express.raw({ type: 'text/plain', limit: '1mb' })); 

// Static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use("/admin", adminRouter);
app.use("/common", commonRouter);
app.use('/api', productRoutes);
app.use('/comment', commentRoutes);
app.use('/feed', feedRoutes);
app.use('/playlists', playlistsRoutes);
app.use('/order', orderRoutes);
app.use('/preferenceRouter', PreferenceRouter);
app.use("/messages", chatMessageRoutes);
app.use("/link", linkAccountRoutes);

// Error Handling
app.use(errorHandling);


// Server
const PORT = process.env.port || 3000;
const server = http.createServer(app);


// const io = initializeSocket(server);
const chatIo = new Server(server, {
  cors: {
      origin: "*", // Adjust based on your frontend URL
      methods: ["GET", "POST"],
  }
});
chatSocket(chatIo);
// redisService.connect();

// redisService.subscribeToNotifications(io);

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const interfaceName in interfaces) {
      for (const iface of interfaces[interfaceName]) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
    return "localhost";
  }
server.listen(PORT, "0.0.0.0",() => {
    const localIP = getLocalIP();
  console.log(`🚀 Server is running on http://${localIP}:${PORT}`);
});
