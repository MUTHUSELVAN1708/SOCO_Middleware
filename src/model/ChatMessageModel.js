import mongoose from "mongoose";

const MessageType = ["text", "image", "audio", "video", "file", "location"];
const MessageStatus = ["sending", "sent", "delivered", "read", "failed"];

const chatMessageSchema = new mongoose.Schema(
  {
    chatId: { type: String, required: true },
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    content: { type: String, required: true },
    mediaUrl: { type: String, default: null },
    type: { type: String, enum: MessageType, required: true },
    status: { type: String, enum: MessageStatus, required: true },
    timestamp: {
      type: Date,
      default: () => {
        const now = new Date();
        const localTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        return localTime;
      },
    },
    isMe: { type: Boolean, required: true },
    isForwarded: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    replyToMessageId: { type: String, default: null },
    audioDuration: { type: Number, default: null },
    fileSize: { type: Number, default: null },
    fileName: { type: String, default: null },
    isDeletedLocally: { type: Boolean, default: false },
    isStoredLocally: { type: Boolean, default: false },
  },
  { timestamps: true }
);


const ChatMessageModel = mongoose.model("ChatMessage", chatMessageSchema);

export default ChatMessageModel;