import express from "express";
import http from "http";
import cors from "cors";
import "dotenv/config";
import { fileURLToPath } from "url";
import path from "path";

import "./src/db/db.js"; 
import adminRouter from "./src/router/adminRouter.js";
import commonRouter from "./src/router/commonRouter.js";
import productRoutes from "./src/router/productRoutes.js";
import commentRoutes from "./src/router/commentRoutes.js";
import feedRoutes from "./src/router/feedRouter.js";
import errorHandling from "./errorHandling.js";
import  initializeSocket from "./socket.js";
// import redisService from "./src/service/redisService.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' })); // Adjust the limit if needed
app.use(express.urlencoded({ extended: true })); // URL-encoded form data
app.use(express.raw({ type: 'text/plain', limit: '1mb' })); // Raw text payloads

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

// Error Handling
app.use(errorHandling);


// Server
const PORT = process.env.port || 3000;
const server = http.createServer(app);


const io = initializeSocket(server);
// redisService.connect();

// redisService.subscribeToNotifications(io);
server.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
});
