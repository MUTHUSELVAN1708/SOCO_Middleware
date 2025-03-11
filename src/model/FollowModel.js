import mongoose from "mongoose";

const FollowSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true }, // User who is following
        followingId: { type: String, required: true, index: true }, // User being followed
        userReference: { type: String, required: true, enum: ["User", "businessRegister"] }, // Follower type
        followingReference: { type: String, required: true, enum: ["User", "businessRegister"] }, // Followed account type
    },
    { timestamps: true }
);

FollowSchema.index({ userId: 1, followingId: 1 }, { unique: true }); // Prevent duplicates

const Follow = mongoose.model("Follow", FollowSchema);
export default Follow;

