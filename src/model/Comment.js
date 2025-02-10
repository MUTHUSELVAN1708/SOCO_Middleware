import mongoose from "mongoose";
const { Schema } = mongoose;

const commentSchema = new mongoose.Schema({
  postId: { type: String, required: true },
  commentId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: String }], // Array of userIds who liked the comment
  likesCount: { type: Number, default: 0 }, // Add likesCount field
  replyCount: { type: Number, default: 0 },
  hasMoreReplies: { type: Boolean, default: false },
  userInfo: { type: mongoose.Schema.Types.ObjectId, ref: 'UserInfo' },
  parentCommentId: { type: String, default: null },
});

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
