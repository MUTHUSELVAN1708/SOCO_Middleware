import mongoose from "mongoose";
import Playlist from "../model/playlistModel.js";
import createPostModel from "../model/createPostModel.js";
import { v4 as uuidv4 } from "uuid";
import { handleSuccess, handleError, handleSuccessV1 } from "../utils/responseHandler.js";
import Comment from "../model/Comment.js";
import FavoriteModel from "../model/favoriteModel.js";
import BookmarkModel from "../model/BookmarkModel.js";
import UserInfo from "../model/UserInfo.js";

const addToWatchLater = async (req, res) => {
  const { userId, videoId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId) || !videoId) {
    return handleError(res, 400, "Invalid request: userId or videoId is missing/invalid.");
  }

  try {
    let watchLaterPlaylist = await Playlist.findOne({ userId, name: "Keep for Later" });

    if (!watchLaterPlaylist) {
      // Create Watch Later playlist if it doesn't exist
      watchLaterPlaylist = new Playlist({
        playlistId: uuidv4(),
        userId: new mongoose.Types.ObjectId(userId),
        name: "Keep for Later",
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

    return handleSuccess(res, 200, "Video added to Keep for Later", watchLaterPlaylist);
  } catch (error) {
    return handleError(res, 500, `Error updating Keep for Later: ${error.message}`);
  }
};


// Create a new playlist
const createPlaylist = async (req, res) => {
  const { userId, name, isPublic = true } = req.body;

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
      isPublic,
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
        isPublic: newPlaylist.isPublic,
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
    let watchLaterPlaylist = await Playlist.findOne({ userId, name: "Keep for Later" });

    if (!watchLaterPlaylist) {
      watchLaterPlaylist = new Playlist({
        playlistId: uuidv4(),
        userId: new mongoose.Types.ObjectId(userId),
        name: "Keep for Later",
        videos: [],
        isPublic: true,
      });
      await watchLaterPlaylist.save();
    }

    const playlists = await Playlist.find({ userId }).sort({ _id: -1 });

    const formattedPlaylists = playlists
      .filter(playlist => playlist.name !== "LikedPosts")
      .map(playlist => ({
        playlistId: playlist.playlistId,
        name: playlist.name,
        isVideoInPlaylist: playlist.videos.includes(videoId),
        isPublic: playlist.isPublic,
      }));

    // Sorting logic
    formattedPlaylists.sort((a, b) => {
      if (a.name === "Keep for Later") return -1;
      if (b.name === "Keep for Later") return 1;
      if (a.isVideoInPlaylist && !b.isVideoInPlaylist) return -1;
      if (!a.isVideoInPlaylist && b.isVideoInPlaylist) return 1;
      return 0;
    });

    return handleSuccessV1(res, 200, "Playlists fetched successfully", formattedPlaylists);
  } catch (error) {
    return handleError(res, 500, error.message);
  }
};



const getAllPlaylistsPaginated = async (req, res) => {
  try {
    const { userId, page = 1, limit = 10 } = req.query;

    if (!userId) {
      return handleError(res, 400, "User ID is required");
    }

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    const playlistQuery = { userId, videos: { $exists: true, $ne: [] } };

    const totalPlayListCount = await Playlist.countDocuments(playlistQuery);

    const playlists = await Playlist.find(playlistQuery)
      .select("playlistId name videos")
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize);

    const formattedPlaylists = await Promise.all(
      playlists.map(async (playlist) => {
        const videos = await createPostModel
          .find({ _id: { $in: playlist.videos } })
          .select("mediaItems videoDuration userName");

        const firstMedia = videos[0]?.mediaItems?.find(item => item.thumbnailUrl || item.url);

        return {
          title: playlist.name || "Untitled",
          thumbnailUrl: firstMedia?.thumbnailUrl || firstMedia?.url || "",
          channelName: videos[0]?.userName || "Unknown",
          videoCount: playlist.videos.length,
          playlistId: playlist.playlistId,
          videoLength: formatTotalDuration(videos),
        };
      })
    );

    formattedPlaylists.sort((a, b) => b.videoCount - a.videoCount);

    const hasMorePlaylist = (pageNumber * pageSize) < totalPlayListCount;

    return handleSuccessV1(res, 200, "Playlists fetched successfully", {
      playlists: formattedPlaylists,
      hasMorePlaylist,
      totalPlayListCount,
    });
  } catch (error) {
    return handleError(res, 500, error.message);
  }
};


const getPlaylistItems = async (req, res) => {
  try {
    const { playlistId, page = 1, limit = 15, userId } = req.query;

    if (!playlistId) {
      return handleError(res, 400, "Playlist ID is required");
    }

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    const playlist = await Playlist.findOne({ playlistId });

    if (!playlist || !Array.isArray(playlist.videos) || playlist.videos.length === 0) {
      return handleSuccessV1(res, 200, "No posts found in this playlist", {
        posts: [],
        pagination: {
          totalResults: 0,
          totalPages: 0,
          currentPage: pageNumber,
          limit: pageSize,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    }

    const totalResults = playlist.videos.length;
    const totalPages = Math.ceil(totalResults / pageSize);
    const startIndex = (pageNumber - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedVideoIds = playlist.videos.slice(startIndex, endIndex);

    const posts = await createPostModel.find({ _id: { $in: paginatedVideoIds } });

    let favoritePostIds = new Set();
    let bookmarkedPostIds = new Set();

    if (userId) {
      const viewerObjectId = new mongoose.Types.ObjectId(userId);

      const [favoritePosts, bookmarkedPosts] = await Promise.all([
        FavoriteModel.find({ user_id: viewerObjectId }).select("post_id").lean(),
        BookmarkModel.find({ user_id: viewerObjectId }).select("post_id").lean(),
      ]);

      favoritePostIds = new Set(favoritePosts.map(f => f.post_id.toString()));
      bookmarkedPostIds = new Set(bookmarkedPosts.map(b => b.post_id.toString()));
    }

    const formattedPosts = await Promise.all(
      posts.map(async (post) => {
        const postIdStr = post._id.toString();
        console.log("Checking post:", postIdStr, {
          isFavorite: favoritePostIds.has(postIdStr),
          isBookmarked: bookmarkedPostIds.has(postIdStr),
        });

        const isFavorite = favoritePostIds.has(postIdStr);
        const isBookmarked = bookmarkedPostIds.has(postIdStr);

        let topComments = await Comment.find({ postId: post._id })
          .sort({ likesCount: -1, createdAt: -1 })
          .limit(2)
          .lean();

        if (!topComments.length) {
          topComments = await Comment.find({ postId: post._id })
            .sort({ createdAt: -1 })
            .limit(2)
            .lean();
        }

        const formattedComments = await Promise.all(
          topComments.map(async (comment) => {
            const user = await UserInfo.findOne({ id: comment.userId });
            return {
              commentId: comment._id.toString(),
              id: comment._id.toString(),
              content: comment.content,
              createdAt: comment.createdAt,
              userInfo: {
                name: user?.name || "",
                avatar: user?.avatarUrl || "",
              },
            };
          })
        );

        return {
          id: postIdStr,
          username: post.userName,
          userAvatar: post.userAvatar,
          caption: post.caption,
          thumbnailUrl: post.thumbnailUrl,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          viewsCount: post.viewsCount,
          sharesCount: post.sharesCount,
          rePostCount: post.rePostCount,
          userId: post.userId,
          productId: post.productId,
          isBusinessAccount: post.isBusinessAccount,
          isRepost: post.isRepost,
          isOwnPost: post.isOwnPost,
          isProductPost: post.isProductPost,
          mediaItems: (post.mediaItems || []).map((media) => ({
            url: media.url,
            type: media.type,
            thumbnailUrl: media.thumbnailUrl,
            productName: media.productName,
            price: media.price,
            originalPrice: media.originalPrice,
            hasDiscount: media.hasDiscount,
          })),
          repostDetails: post.repostDetails
            ? {
              originalPostId: post.repostDetails.originalPostId?.toString() || "",
              originalUserId: post.repostDetails.originalUserId || "",
              originalUserName: post.repostDetails.originalUserName || "",
              originalUserAvatar: post.repostDetails.originalUserAvatar || "",
              originalCaption: post.repostDetails.originalCaption || "",
              originalMediaItems: (post.repostDetails.originalMediaItems || []).map((media) => ({
                url: media.url,
                type: media.type,
                thumbnailUrl: media.thumbnailUrl,
                productName: media.productName,
                price: media.price,
                originalPrice: media.originalPrice,
                hasDiscount: media.hasDiscount,
              })),
            }
            : null,
          likes: post.likesCount,
          comments: formattedComments,
          timestamp: post.timestamp,
          isFavorite,
          isBookmarked,
        };
      })
    );

    return handleSuccessV1(res, 200, "Playlist items fetched successfully", {
      posts: formattedPosts,
      pagination: {
        totalResults,
        totalPages,
        currentPage: pageNumber,
        limit: pageSize,
        hasNextPage: pageNumber < totalPages,
        hasPreviousPage: pageNumber > 1,
      },
    });
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

    const playlists = await Playlist.find({ userId, videos: { $exists: true, $ne: [] } })
      .select("playlistId name videos");

    const formattedPlaylists = await Promise.all(
      playlists.map(async (playlist) => {
        const videos = await createPostModel
          .find({ _id: { $in: playlist.videos } })
          .select("mediaItems videoDuration userName");

        const firstMedia = videos[0]?.mediaItems?.find(item => item.thumbnailUrl || item.url);

        return {
          title: playlist.name || "Untitled",
          thumbnailUrl: firstMedia?.thumbnailUrl || firstMedia?.url || "",
          channelName: videos[0]?.userName || "Unknown",
          videoCount: playlist.videos.length,
          playlistId: playlist.playlistId,
          videoLength: formatTotalDuration(videos),
        };
      })
    );

    formattedPlaylists.sort((a, b) => {
      if (a.title === "LikedPosts") return -1;
      if (b.title === "LikedPosts") return 1;
      return b.videoCount - a.videoCount;
    });

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
      channelName: videoDetails.length > 0 ? videoDetails[0].channelName : "",
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
  getAllPlaylistsPaginated,
  getPlaylistItems,
};
