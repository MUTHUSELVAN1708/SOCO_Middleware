import express from "express";
import http from "http";
import cors from "cors";
import bodyParser from  "body-parser";
import "dotenv/config";
import "./src/db/db.js";
import adminRouter from "./src/router/adminRouter.js"
import commonRouter  from "./src/router/commonRouter.js";
import { fileURLToPath } from "url";
import path from "path";


const app=express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.json({ limit: '20gb' }));
app.use(express.urlencoded({ limit: '20gb', extended: true }));


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use("/admin",adminRouter);
app.use("/common",commonRouter);
const server=http.createServer(app);


server.listen(process.env.port,()=>{
    console.log(`server is running on ${process.env.port}`)
})