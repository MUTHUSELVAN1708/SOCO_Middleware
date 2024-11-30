import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  user_id: {
      type: String,  // Change this to String if you want to store user_id as a string
      required: true
  },
  imageUrl: String,
  caption: String,
  likes: Number,
  tags: [String],
  timestamp: { type: Date, default: Date.now }
});

// Create indexes for better query performance
postSchema.index({ user_id: 1, timestamp: -1 });
postSchema.index({ user_id: 1 });
postSchema.index({ timestamp: -1 });

const Post = mongoose.model('post', postSchema);

export default Post;
