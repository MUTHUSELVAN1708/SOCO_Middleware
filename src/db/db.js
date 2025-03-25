import mongoose from "mongoose";

const db = mongoose.connect("mongodb://localhost:27017/soco", {
}).then(() => {
    console.log("Connected to MongoDB with IST Time Zone");
}).catch((error) => {
    console.error("Error connecting to DB:", error);
});

export default db;
