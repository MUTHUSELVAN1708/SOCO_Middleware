import mongoose from "mongoose";
import Playlist from "../model/playlistModel.js";
import createPostModel from "../model/createPostModel.js";
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
            return res.status(400).json({
                success: false,
                status: 400,
                message: "Invalid userId format"
            });
        }

        const existingPlaylist = await Playlist.findOne({ userId, name });
        if (existingPlaylist) {
            return res.status(409).json({
                success: false,
                status: 409,
                message: "A playlist with this name already exists for this user"
            });
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
        return res.status(500).json({
            success: false,
            status: 500,
            message: error.message
        });
    }
};


const getUserPlaylistsWithVideoStatus = async (req, res) => {
    const { userId, videoId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return handleError(res, 400, "Invalid userId format");
    }

    try {
        let watchLaterPlaylist = await Playlist.findOne({ userId, name: "Watch Later" });

        if (!watchLaterPlaylist) {
            watchLaterPlaylist = new Playlist({
                playlistId: uuidv4(),
                userId: new mongoose.Types.ObjectId(userId),
                name: "Watch Later",
                videos: [],
            });
            await watchLaterPlaylist.save();
        }

        const playlists = await Playlist.find({ userId }).sort({ _id: -1 });

        const formattedPlaylists = playlists.map(playlist => ({
            playlistId: playlist.playlistId,
            name: playlist.name,
            isVideoInPlaylist: playlist.videos.includes(videoId),
        }));

        // Sorting logic
        formattedPlaylists.sort((a, b) => {
            if (a.name === "Watch Later") return -1; // Watch Later first
            if (b.name === "Watch Later") return 1;
            if (a.isVideoInPlaylist && !b.isVideoInPlaylist) return -1; // Videos that contain the video come next
            if (!a.isVideoInPlaylist && b.isVideoInPlaylist) return 1;
            return 0; // Maintain original date order for others
        });

        return handleSuccessV1(res, 200, "Playlists fetched successfully", formattedPlaylists);
    } catch (error) {
        return handleError(res, 500, error.message);
    }
};


const getAllPlaylists = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return handleError(res, 400, "User ID is required");
        }

        // Fetch playlists belonging to the given userId
        const playlists = await Playlist.find({ userId }).select("playlistId name videos");

        // Fetch video details for each playlist
        const formattedPlaylists = await Promise.all(
            playlists.map(async (playlist) => {
                // Fetch video details from createPostModel
                const videos = await createPostModel
                    .find({ _id: { $in: playlist.videos } })
                    .select("thumbnailFile videoDuration creatorName ");

                return {
                    title: playlist.name || "Untitled",
                    thumbnailUrl: videos.length > 0 ? videos[0].thumbnailFile || "" : "", 
                    channelName: videos.length > 0 ? videos[0].creatorName || "Unknown" : "Unknown", // Use first video's creatorName
                    videoCount: playlist.videos.length, 
                    playlistId: playlist.playlistId,
                    videoLength: formatTotalDuration(videos), 
                };
            })
        );

        // Sort playlists in descending order by videoCount
        formattedPlaylists.sort((a, b) => b.videoCount - a.videoCount);

        return handleSuccessV1(res, 200, "Playlists fetched successfully", formattedPlaylists);
    } catch (error) {
        return handleError(res, 500, error.message);
    }
};


const getPlaylistDetails = async (req, res) => {
    try {
        const { playlistId } = req.query;

        if (!playlistId) {
            return handleError(res, 400, "Playlist ID is required");
        }

        // Fetch the playlist details
        const playlist = await Playlist.findOne({ playlistId });

        if (!playlist) {
            return handleError(res, 404, "Playlist not found");
        }

        // Fetch video details from createPostModel and sort by _id (assuming _id represents creation time)
        const videos = await createPostModel
            .find({ _id: { $in: playlist.videos } })
            .sort({ _id: -1 }) // Sorting in descending order (newest first)
            .select("caption creatorName thumbnailFile videoDuration viewsCount timestamp");

        // Format video details
        const videoDetails = videos.map(video => ({
            title: video.caption || "Untitled",
            channelName: video.creatorName || "Unknown",
            viewsCount: video.viewsCount || 0,
            timestamp: video.timestamp,
            thumbnailUrl: video.thumbnailFile || "",
            duration: formatDuration(video.videoDuration), // Helper function to format duration
            isLikedVideo: false, // Placeholder (implement logic if needed)
        }));

        // Construct the response
        const playlistDetails = {
            playlistName: playlist.name,
            thumbnailFile: videoDetails.length > 0 ? videoDetails[0].thumbnailUrl : "",
            channelName: videoDetails.length > 0 ? videoDetails[0].channelName :  "",
            totalVideos: videoDetails.length, // Total video count
            isPrivate: true, 
            videos: videoDetails,
        };

        return handleSuccessV1(res, 200, "Playlist details fetched successfully", playlistDetails);
    } catch (error) {
        return handleError(res, 500, error.message);
    }
};


const formatDuration = (durationInSeconds) => {
    if (!durationInSeconds || isNaN(durationInSeconds)) return "0:00";
    
    const minutes = Math.floor(durationInSeconds / 60);
    const seconds = durationInSeconds % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};





// Function to calculate total duration (optional)
const formatTotalDuration = (videos) => {
    const totalSeconds = videos.reduce((sum, video) => sum + (video.videoDuration || 0), 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

  

// Get all playlists
// const getAllPlaylists = async (req, res) => {
//   try {
//     const playlists = await Playlist.find();
//     return handleSuccess(res, 200, "Playlists fetched successfully", playlists);
//   } catch (error) {
//     return handleError(res, 500, error.message);
//   }
// };

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
    const { playlistId, videoId } = req.body;
  
    try {
    //   if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    //     return handleError(res, 400, "Invalid Playlist ID");
    //   }
  
      const updatedPlaylist = await Playlist.findOneAndUpdate(
        { playlistId: playlistId },
        { $pull: { videos: videoId } },
        { new: true }
      );
  
      if (!updatedPlaylist) return handleError(res, 404, "Playlist not found");
  
      return handleSuccessV1(res, 200, "Video removed from playlist", updatedPlaylist);
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
  getPlaylistDetails,
  getAllPlaylists,
  getPlaylistById,
  addVideoToPlaylists,
  removeVideoFromPlaylist,
  deletePlaylist,
};
