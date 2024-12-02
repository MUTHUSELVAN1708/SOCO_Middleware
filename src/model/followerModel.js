import mongoose from "mongoose";
import user from "./registerModel.js"

const followerSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true }, // User being followed
    follower_id: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true }, // User who follows
    followedAt: { type: Date, default: Date.now }, // Follow timestamp
    status: { 
      type: String, 
      enum: ['requested', 'accepted', 'blocked'], 
     
    }, // Follow status
    isMuted: { type: Boolean, default: false }, // Mute notifications
    isBlocked: { type: Boolean, default: false }, // Blocked status
    priority: { type: Boolean, default: false }, // Close friends or priority flag
    notificationEnabled: { type: Boolean, default: true }, // Activity notifications
  },
  { versionKey: false, timestamps: true } // Automatically include createdAt and updatedAt
);

followerSchema.virtual("follow_id").get(function () {
    return this._id.toString();
  })
const followerModel = mongoose.model('Follower', followerSchema);
export default followerModel;