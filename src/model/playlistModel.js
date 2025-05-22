import mongoose from "mongoose";

const PlaylistSchema = new mongoose.Schema({
  playlistId: { type: String, unique: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  videos: [{ type: String }],
  isPublic: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Playlist", PlaylistSchema);
