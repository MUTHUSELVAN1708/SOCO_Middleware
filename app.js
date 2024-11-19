import express from "express";
import http from "http";
import cors from "cors";
import bodyParser from  "body-parser";
import "dotenv/config";
import "./src/db/db.js";
import adminRouter from "./src/router/adminRouter.js"

const app=express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.json({ limit: '20gb' }));
app.use(express.urlencoded({ limit: '20gb', extended: true }));


app.use("/admin",adminRouter);

const server=http.createServer(app);


server.listen(process.env.port,()=>{
    console.log(`server is running on ${process.env.port}`)
})