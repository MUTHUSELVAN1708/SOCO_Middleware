import mongoose from "mongoose";

const FriendSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true }, // Store userId as String
        userReference: { type: String, required: true, enum: ["User", "businessRegister"] }, // User type
        isBusinessAccount: { type: Boolean, default: false },

        friends: [
            {
                friendId: { type: String, required: true }, // Friend's userId
                friendReference: { type: String, required: true, enum: ["User", "businessRegister"] }, // Friend's account type
                status: {
                    type: String,
                    enum: ["Pending", "Accepted", "Rejected"],
                    default: "Pending",
                }, // Track friendship status
                requestedAt: { type: Date, default: Date.now }, // Timestamp of friend request
                acceptedAt: { type: Date }, // Timestamp when accepted
                rejectedAt: { type: Date }, // Timestamp when rejected
            }
        ],
    },
    { timestamps: true }
);

// Automatically set the correct reference type
FriendSchema.pre("validate", function (next) {
    this.userReference = this.isBusinessAccount ? "businessRegister" : "User";
    next();
});

// Method to update friend request status
FriendSchema.methods.updateFriendStatus = async function (friendId, status) {
    const friend = this.friends.find(f => f.friendId === friendId);
    if (friend) {
        friend.status = status;
        if (status === "Accepted") friend.acceptedAt = new Date();
        if (status === "Rejected") friend.rejectedAt = new Date();
        await this.save();
    }
};

const Friend = mongoose.model("Friend", FriendSchema);
export default Friend;
