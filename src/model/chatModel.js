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
        post_id:{type:mongoose.Schema.Types.ObjectId},
        msgType:{type:String},
        post_url:{type:String},
        message: { type: String, required: false },
        timestamp: { type: Date, default: Date.now },
        sender: { type: String, required: true },
        fileName:{type:String},
        fileSize:{type:String},
      }
    ]
  },
  { versionKey: false }
);

const MessageModel = mongoose.model('Message', messageSchema);

export default MessageModel;
