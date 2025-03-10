import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    recipient_id: { type: String, required: true },
    recipient_type: { type: String, enum: ["user", "seller"], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false },
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
    read: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification;