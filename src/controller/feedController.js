// import createPostModel from "../model/createPostModel.js";
// import trackingModel from "../model/TrackingModel.js";
// import businessRegisterModel from "../model/BusinessModel.js";
// import registerModel from "../model/registerModel.js";
// import followerModel from "../model/followerModel.js";
// import mongoose from "mongoose";
// import FavoriteModel from "../model/favoriteModel.js";
// import BookmarkModel from "../model/BookmarkModel.js";

// export const getDashboardFeed = async (req, res) => {
//     try {
//         const { 
//             user_id, 
//             lat, 
//             lon, 
//             pinCode, 
//             address, 
//             isBusinessAccount,
//             page = 1, 
//             limit: requestedLimit = 15 
//         } = req.body;

//         const limit = 15; 
//         let user = isBusinessAccount
//             ? await businessRegisterModel.findById(user_id)
//             : await registerModel.findById(user_id);

//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }

//         const tracking = await trackingModel.findOne({ 
//             user_id: new mongoose.Types.ObjectId(user_id) 
//         });
        
//         const trackedPostIds = tracking?.sentPosts?.map(post => 
//             new mongoose.Types.ObjectId(post.post_id)
//         ) || [];

//         const baseFilters = {
//             status: "published",
//             // isProductPost: false,
//             creator_id: { $ne: user_id },
//             _id: { $nin: trackedPostIds }
//         };

//         console.log(baseFilters);

//         const following = await followerModel.find({ follower_id: user_id })
//             .select('following_id')
//             .limit(100);
//         const followingIds = following.map(f => f.following_id);

//         let posts = [];
//         const baseSelect = "creatorName creatorProfileImageUrl completeAddress tags isVideo mediaFile thumbnailFile aspectRatio description caption timestamp creator_id likesCount viewsCount state pinCode language commentsCount user_id _id isProductPost isUserPost isBusinessPost productId productPrice";

//         if (followingIds.length) {
//             const followingPosts = await createPostModel.find({
//                 ...baseFilters,
//                 creator_id: { $in: followingIds },
//                 language: { $in: [...(user.languages || []), null] }
//             })
//             .sort({ timestamp: -1 })
//             .limit(Math.ceil(limit * 0.25))
//             .select(baseSelect);

//             posts = [...posts, ...followingPosts];
//         }

//         if (posts.length < limit && pinCode) {
//             const pinCodeVariations = generateNeighboringPinCodes(pinCode);
//             const locationPosts = await createPostModel.find({
//                 ...baseFilters,
//                 _id: { $nin: [...trackedPostIds, ...posts.map(p => p._id)] },
//                 $or: [
//                     { 
//                         pinCode: { $in: pinCodeVariations },
//                         language: { $in: user.languages || [] }
//                     },
//                     {
//                         state: user.state,
//                         language: { $in: user.languages || [] }
//                     },
//                     {
//                         completeAddress: { $regex: escapeRegExp(address), $options: "i" }
//                     }
//                 ]
//             })
//             .sort({ timestamp: -1, viewsCount: -1 })
//             .limit(Math.ceil((limit - posts.length) * 0.35))
//             .select(baseSelect);
            
//             posts = [...posts, ...locationPosts];
//         }

//         if (posts.length < limit && user.interestField?.length) {
//             const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
//             const trendingPosts = await createPostModel.find({ 
//                 ...baseFilters,
//                 _id: { $nin: [...trackedPostIds, ...posts.map(p => p._id)] },
//                 $or: [
//                     { tags: { $in: user.interestField } },
//                     { description: { $regex: user.interestField.join("|"), $options: "i" } }
//                 ],
//                 language: { $in: [...(user.languages || []), null] },
//                 timestamp: { $gte: weekAgo }
//             })
//             .sort({ viewsCount: -1, likesCount: -1 })
//             .limit(limit - posts.length)
//             .select(baseSelect);
            
//             posts = [...posts, ...trendingPosts];
//         }

//         if (posts.length < limit) {
//             const fallbackPosts = await createPostModel.find({
//                 ...baseFilters,
//                 _id: { $nin: [...trackedPostIds, ...posts.map(p => p._id)] },
//                 language: { $in: [...(user.languages || []), null] }
//             })
//             .sort({ viewsCount: -1, timestamp: -1 })
//             .limit(limit - posts.length)
//             .select(baseSelect);

//             posts = [...posts, ...fallbackPosts];
//         }

//         posts = shuffleArray(posts);

//         if (posts.length > 0) {
//             const bulkOps = posts.map(post => ({
//                 updateOne: {
//                     filter: { _id: post._id },
//                     update: { $inc: { viewsCount: 1 } }
//                 }
//             }));

//             await createPostModel.bulkWrite(bulkOps);
//         }

//         const newViewedPosts = posts.map(post => ({
//             post_id: post._id,
//             viewedAt: new Date(),
//             isWatched: false
//         }));

//         if (newViewedPosts.length > 0) {
//             await trackingModel.updateOne(
//                 { user_id: new mongoose.Types.ObjectId(user_id) },
//                 {
//                     $push: {
//                         sentPosts: {
//                             $each: newViewedPosts,
//                             $sort: { viewedAt: -1 },
//                             $slice: 1000  
//                         }
//                     }
//                 },
//                 { upsert: true }
//             );
//         }

//         const favoritePosts = await FavoriteModel.find({ user_id }).select("post_id");
//      const bookmarkedPosts = await BookmarkModel.find({ user_id }).select("post_id");

//       const favoritePostIds = new Set(favoritePosts.map(fav => fav.post_id.toString()));
//       const bookmarkedPostIds = new Set(bookmarkedPosts.map(bookmark => bookmark.post_id.toString()));
//       posts = posts.map(post => ({
//         ...post.toObject(),
//         isFavorite: favoritePostIds.has(post._id.toString()),
//         isBookmarked: bookmarkedPostIds.has(post._id.toString())
//     }));

//         return res.json({
//             posts,
//             pagination: {
//                 currentPage: page,
//                 hasNextPage: posts.length === limit,
//                 limit,
//                 total: posts.length
//             }
//         });
//     } catch (error) {
//         console.error("Error fetching dashboard feed:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// };

// function generateNeighboringPinCodes(pinCode) {
//     const pinCodeNum = parseInt(pinCode);
//     return [pinCodeNum, pinCodeNum - 1, pinCodeNum + 1, pinCodeNum - 2, pinCodeNum + 2].map(num => num.toString().padStart(6, '0'));
// }

// function escapeRegExp(string) {
//     return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// }

// function shuffleArray(array) {
//     return array.sort(() => Math.random() - 0.5);
// }


import mongoose from "mongoose";
import createPostModel from "../model/createPostModel.js";
import businessRegisterModel from "../model/BusinessModel.js";
import registerModel from "../model/registerModel.js";
import FavoriteModel from "../model/favoriteModel.js";
import BookmarkModel from "../model/BookmarkModel.js";
import CommentModel from "../model/Comment.js";
import UserInfo from "../model/UserInfo.js";
import Follow from "../model/FollowModel.js";

export const getDashboardFeed = async (req, res) => {
  try {
    const { user_id, isBusinessAccount, page = 1, limit = 15 } = req.body;
    const skip = (page - 1) * limit;

    const objectId = new mongoose.Types.ObjectId(user_id);

    const user = isBusinessAccount
      ? await businessRegisterModel.findById(objectId)
      : await registerModel.findById(objectId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const posts = await createPostModel
      .find({})
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const totalResults = await createPostModel.countDocuments({});
    const totalPages = Math.ceil(totalResults / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    const favoritePosts = await FavoriteModel.find({ user_id: objectId }).select("post_id");
    const bookmarkedPosts = await BookmarkModel.find({ user_id: objectId }).select("post_id");

    const favoriteSet = new Set(favoritePosts.map((f) => f.post_id.toString()));
    const bookmarkSet = new Set(bookmarkedPosts.map((b) => b.post_id.toString()));

    const formattedPosts = await Promise.all(
      posts.map(async (post) => {
        const isFavorite = favoriteSet.has(post._id.toString());
        const isBookmarked = bookmarkSet.has(post._id.toString());

        let topComments = await CommentModel.find({ postId: post._id })
          .sort({ likesCount: -1, createdAt: -1 })
          .limit(2)
          .lean();

        if (!topComments.length) {
          topComments = await CommentModel.find({ postId: post._id })
            .sort({ createdAt: -1 })
            .limit(2)
            .lean();
        }

        const formattedComments = await Promise.all(
            topComments.map(async (comment) => {
              const user = await UserInfo.findOne({ id: comment.userId }); // userId should exist on comment
          
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
            id: post._id.toString(),
            username: post.userName,
            userId: post.userId,
            productId: post.productId,
            isBusinessAccount: post.isBusinessAccount,
            userAvatar: post.userAvatar,
            caption: post.caption,
            thumbnailUrl: post.thumbnailUrl,
            likesCount: post.likesCount,
            commentsCount: post.commentsCount,
            viewsCount: post.viewsCount,
            sharesCount: post.sharesCount,
            rePostCount: post.rePostCount,
            isRepost: post.isRepost,
            isOwnPost: post.isOwnPost,
            isProductPost: post.isProductPost,
            mediaItems: post.mediaItems.map((media) => ({
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
      isBusinessAccount: await (async () => {
        const originalUser = await registerModel.findOne({ _id: post.repostDetails.originalUserId });
        if (originalUser) return false;
        const originalBusinessUser = await businessRegisterModel.findOne({ _id: post.repostDetails.originalUserId });
        return !!originalBusinessUser;
      })(),
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

    return res.json({
      posts: formattedPosts,
      pagination: {
        totalResults,
        totalPages,
        currentPage: Number(page),
        limit,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (error) {
    console.error("Error in getDashboardFeed:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const suggestion = async (req, res) => {
  try {
    const userId = req.query.userId;
    const type = req.query.type;

    const MAX_LIMIT = 10;

    if (!userId || !type) {
      return res.status(400).json({ message: 'User ID and type are required in query params' });
    }

    if (type === 'user') {
      const directFollows = await Follow.find({ userId });
      const directlyFollowedIds = directFollows.map(f => f.followingId.toString());

      const directFollowsdetails = await registerModel.find({ _id: { $in: directlyFollowedIds } })
        .select('_id full_Name profile_url');

      const followsByDirects = await Follow.find({ userId: { $in: directlyFollowedIds } });

      const bizToFollowerMap = {};
      followsByDirects.forEach(f => {
        const followeeId = f.followingId.toString();
        const followerId = f.userId.toString();

        if (!bizToFollowerMap[followeeId]) {
          bizToFollowerMap[followeeId] = new Set();
        }
        bizToFollowerMap[followeeId].add(followerId);
      });

      const businessIds = Object.keys(bizToFollowerMap);
      let recommendations = [];

      if (businessIds.length > 0) {
        const businessesFollowed = await businessRegisterModel.find({ _id: { $in: businessIds } })
          .limit(MAX_LIMIT)
          .select('_id businessName brand_logo followerCount user_id');

        recommendations = businessesFollowed.map(biz => {
          const mutualFollowerIds = Array.from(bizToFollowerMap[biz._id.toString()] || []);
          const mutualFollowers = directFollowsdetails.filter(d =>
            mutualFollowerIds.includes(d._id.toString())
          );

          return {
            id: biz._id,
            username: biz.businessName,
            profileImage: biz.brand_logo,
            totalFollowers: biz.followerCount,
            userId: biz.user_id,
            type: 'business',
            mutualFollowers
          };
        });
      } else {
        const allBusinesses = await businessRegisterModel.find({ _id: { $ne: userId } })
          .sort({ followerCount: -1 })
          .limit(MAX_LIMIT)
          .select('_id businessName brand_logo followerCount user_id');

        recommendations = allBusinesses.map(biz => ({
          id: biz._id,
          username: biz.businessName,
          profileImage: biz.brand_logo,
          totalFollowers: biz.followerCount,
          userId: biz.user_id,
          type: 'business',
          mutualFollowers: []
        }));
      }

      return res.status(200).json({
        message: 'Recommended business accounts fetched successfully',
        directFollowsdetails,
        recommendations
      });
    }

    else if (type === 'business') {
      const currentBusiness = await businessRegisterModel.findById(userId).select('natureOfBusiness');

      if (!currentBusiness) {
        return res.status(404).json({ message: 'Business not found' });
      }

      const relatedBusinesses = await businessRegisterModel.find({
        _id: { $ne: userId },
        natureOfBusiness: currentBusiness.natureOfBusiness
      })
        .sort({ followerCount: -1 })
        .limit(MAX_LIMIT)
        .select('_id businessName brand_logo followerCount user_id');

      const recommendations = relatedBusinesses.map(biz => ({
        id: biz._id,
        username: biz.businessName,
        profileImage: biz.brand_logo,
        totalFollowers: biz.followerCount,
        userId: biz.user_id,
        type: 'business',
        mutualFollowers: []
      }));

      return res.status(200).json({
        message: 'Recommended related businesses fetched successfully',
        recommendations
      });
    } else {
      return res.status(400).json({ message: 'Invalid type parameter. Must be "user" or "business".' });
    }
  } catch (error) {
    console.error('Error fetching business recommendations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

