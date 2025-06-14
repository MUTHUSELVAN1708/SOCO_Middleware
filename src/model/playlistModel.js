import mongoose from "mongoose";

const PlaylistSchema = new mongoose.Schema({
  playlistId: { type: String, unique: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  videos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],


  isPublic: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const Playlist = mongoose.model("Playlist", PlaylistSchema);
export default Playlist;