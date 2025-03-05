import mongoose from "mongoose";
import Playlist from "../model/playlistModel.js";
import { v4 as uuidv4 } from "uuid";
import { handleSuccess, handleError,handleSuccessV1 } from "../utils/responseHandler.js";

const addToWatchLater = async (req, res) => {
    const { userId, videoId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId) || !videoId) {
        return handleError(res, 400, "Invalid request: userId or videoId is missing/invalid.");
    }

    try {
        let watchLaterPlaylist = await Playlist.findOne({ userId, name: "Watch Later" });

        if (!watchLaterPlaylist) {
            // Create Watch Later playlist if it doesn't exist
            watchLaterPlaylist = new Playlist({
                playlistId: uuidv4(),
                userId: new mongoose.Types.ObjectId(userId),
                name: "Watch Later",
                videos: [videoId],
            });
            await watchLaterPlaylist.save();
        } else {
            // Add video if not already present
            if (!watchLaterPlaylist.videos.includes(videoId)) {
                watchLaterPlaylist.videos.push(videoId);
                await watchLaterPlaylist.save();
            }
        }

        return handleSuccess(res, 200, "Video added to Watch Later", watchLaterPlaylist);
    } catch (error) {
        return handleError(res, 500, `Error updating Watch Later: ${error.message}`);
    }
};


// Create a new playlist
const createPlaylist = async (req, res) => {
    const { userId, name } = req.body;
  
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, status: 400, message: "Invalid userId format" });
      }
  
      const existingPlaylist = await Playlist.findOne({ userId, name });
      if (existingPlaylist) {
        return res.status(409).json({ success: false, status: 409, message: "Playlist with this name already exists" });
      }
  
      const newPlaylist = new Playlist({
        playlistId: uuidv4(),
        userId: new mongoose.Types.ObjectId(userId),
        name,
        videos: [],
      });
  
      await newPlaylist.save();
  
      return res.status(201).json({
        success: true,
        status: 201,
        message: "Playlist created successfully",
        playlist: {
          _id: newPlaylist._id,
          playlistId: newPlaylist.playlistId,
          userId: newPlaylist.userId,
          name: newPlaylist.name,
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, status: 500, message: error.message });
    }
  };

const getUserPlaylistsWithVideoStatus = async (req, res) => {
    const { userId, videoId } = req.body;
  
    try {
      const playlists = await Playlist.find({ userId });
  
      const response = playlists.map(playlist => ({
        playlistId: playlist.playlistId,
        name: playlist.name,
        isVideoInPlaylist: playlist.videos.includes(videoId)
      }));
  
      return handleSuccessV1(res, 200, "Playlists fetched successfully", response);
    } catch (error) {
      return handleError(res, 500, error.message);
    }
  };
  

// Get all playlists
const getAllPlaylists = async (req, res) => {
  try {
    const playlists = await Playlist.find();
    return handleSuccess(res, 200, "Playlists fetched successfully", playlists);
  } catch (error) {
    return handleError(res, 500, error.message);
  }
};

// Get a single playlist by ID
const getPlaylistById = async (req, res) => {
  const { playlistId } = req.params;
  try {
    const playlist = await Playlist.findOne({ playlistId });
    if (!playlist) return handleError(res, 404, "Playlist not found");
    return handleSuccess(res, 200, "Playlist fetched successfully", playlist);
  } catch (error) {
    return handleError(res, 500, error.message);
  }
};

// Add a video to a playlist
const addVideoToPlaylists = async (req, res) => {
    const { playlistIds, videoId } = req.body; 

    if (!videoId) {
        return handleError(res, 400, "Invalid request: videoId is required.");
    }

    try {
        let updateResult;

        if (Array.isArray(playlistIds) && playlistIds.length > 0) {
            // Add video to specified playlists
            updateResult = await Playlist.updateMany(
                { playlistId: { $in: playlistIds } },
                { $addToSet: { videos: videoId } }
            );
        } else {
            // Remove video from all playlists if playlistIds array is empty
            updateResult = await Playlist.updateMany(
                { videos: videoId },
                { $pull: { videos: videoId } }
            );
        }

        return handleSuccess(res, { 
            message: playlistIds?.length 
                ? `${updateResult.modifiedCount} playlist(s) updated successfully.` 
                : `${updateResult.modifiedCount} playlist(s) updated successfully.`,
            data: updateResult, 
            statusCode: 200 
        });
    } catch (error) {
        return handleError(res, 500, `Error updating playlists: ${error.message}`);
    }
};


  

// Remove a video from a playlist
const removeVideoFromPlaylist = async (req, res) => {
  const { playlistId } = req.params;
  const { videoId } = req.body;
  try {
    const updatedPlaylist = await Playlist.findOneAndUpdate(
      { playlistId },
      { $pull: { videos: videoId } },
      { new: true }
    );
    if (!updatedPlaylist) return handleError(res, 404, "Playlist not found");
    return handleSuccess(res, 200, "Video removed from playlist", updatedPlaylist);
  } catch (error) {
    return handleError(res, 500, error.message);
  }
};

// Delete a playlist
const deletePlaylist = async (req, res) => {
  const { playlistId } = req.params;
  try {
    const deletedPlaylist = await Playlist.findOneAndDelete({ playlistId });
    if (!deletedPlaylist) return handleError(res, 404, "Playlist not found");
    return handleSuccess(res, 200, "Playlist deleted successfully", deletedPlaylist);
  } catch (error) {
    return handleError(res, 500, error.message);
  }
};

export {
  addToWatchLater,
  createPlaylist,
  getUserPlaylistsWithVideoStatus,
  getAllPlaylists,
  getPlaylistById,
  addVideoToPlaylists,
  removeVideoFromPlaylist,
  deletePlaylist,
};
