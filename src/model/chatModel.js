// models/message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    participants: {
      type: [String],
      required: true,
    },
    messages: [
      {
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        sender: { type: String, required: true }
      }
    ]
  },
  { versionKey: false }
);

const MessageModel = mongoose.model('Message', messageSchema);

export default MessageModel;
