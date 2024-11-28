// import mongoose from "../db/db.js";
import mongoose from "mongoose";
const postSchema = new mongoose.Schema({
 
    user_id: { 
        type: String,
        required: true
      },
      posts: [{ imageUrl: {
        type: String,
        required: true
      },
      caption: {
        type: String,
        required: true
      },
      likes: {
        type: Number,
        required: true
      },
      comments: {
        type: Number,
        required: true
      },
      tags:{
        type: [String], 
    required: true
  }}],
  timestamp: {
    type: Date,
    default: Date.now
  },
}, {
  versionKey: false
});
postSchema.virtual("post_id").get(function () {
  return this._id.toString();
});
const postModel = mongoose.model("post", postSchema);

export default postModel;