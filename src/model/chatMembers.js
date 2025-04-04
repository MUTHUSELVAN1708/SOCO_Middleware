import mongoose from "mongoose";

const ChatMembersSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, index: true },
        name: { type: String, required: true },
        avatarUrl: { type: String },
        phoneNumber: { type: String },
        lastSeen: { type: Date, default: null },
        isOnline: { type: Boolean, default: false },
        userReference: { type: String, required: true, enum: ["User", "businessRegister"] },
        player: [
            {
                playerId: { type: String, required: true },
                name: { type: String, required: true },
                avatarUrl: { type: String },
                playerReference: { type: String, required: true, enum: ["User", "businessRegister"] },
                phoneNumber: { type: String },
                status: {
                    type: String,
                    enum: ["Active", "Blocked"],
                    default: "Active",
                },
                lastSeen: { type: Date, default: Date.now },
                isOnline: { type: Boolean, default: false },
            },
        ],
    },
    { timestamps: true }
);

// Automatically set the correct reference type before validation
ChatMembersSchema.pre("validate", function (next) {
    if (!this.userReference) {
        this.userReference = this.isBusinessAccount ? "businessRegister" : "User";
    }
    next();
});

const ChatMember = mongoose.model("ChatMember", ChatMembersSchema);
export default ChatMember;
