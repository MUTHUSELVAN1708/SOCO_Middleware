import mongoose from "mongoose";
const { Schema } = mongoose;

const commentLikeSchema = new mongoose.Schema({
  commentId: { type: String, required: true }, // Ensure it's a String
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const CommentLike = mongoose.model('CommentLike', commentLikeSchema);
export default CommentLike;
