import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    notificationType: { type: String, enum: ["link_request", "order_update", "general"], required: true },
    imageUrl: { type: String, default: null }, 
    isRead: { type: Boolean, default: false },
    isPerformAction: { type: Boolean, default: false },
    isPerformed: { type: Boolean, default: false },
    actions: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Notification", notificationSchema);

