import mongoose from "mongoose";

const db = mongoose.connect("mongodb+srv://soco_admin:socoMongo56@ascendingsoco.1lzunrs.mongodb.net/", {
}).then(() => {
    console.log("Connected to MongoDB with IST Time Zone");
}).catch((error) => {
    console.error("Error connecting to DB:", error);
});

export default db;
