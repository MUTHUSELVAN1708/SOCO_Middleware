import express from "express";
import {
    addToWatchLater,
  createPlaylist,
  getUserPlaylistsWithVideoStatus,
  getAllPlaylists,
  getPlaylistById,
  addVideoToPlaylists,
  removeVideoFromPlaylist,
  deletePlaylist,
} from "../controller/playlistController.js";

const router = express.Router();

router.post("/addToWatchLater", addToWatchLater);
router.post("/create", createPlaylist);
router.get("/user-playlists", getUserPlaylistsWithVideoStatus);
router.get("/all", getAllPlaylists);
router.get("/:playlistId", getPlaylistById);
router.put("/add-video", addVideoToPlaylists);
router.put("/remove-video", removeVideoFromPlaylist);
router.delete("/:playlistId", deletePlaylist);

export default router;
