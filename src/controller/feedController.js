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
import businessregisterModel from "../model/BusinessModel.js";

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

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required in query params' });
    }

    // 1. Direct follows of the user
    const directFollows = await Follow.find({ userId });
    const directlyFollowedIds = directFollows.map(f => f.followingId.toString());
console.log(directlyFollowedIds,"directlyFollowedIds")
    // Get their details
    const directFollowsdetails = await registerModel.find({ _id: { $in: directlyFollowedIds } })
      .select('_id full_Name profile_url');
console.log(directFollowsdetails,"directFollowsdetails")
    // 2. Get second-degree follows (followed by those you follow)
    const secondDegreeFollows = await Follow.find({ userId: { $in: directlyFollowedIds } });
    const secondDegreeIds = secondDegreeFollows.map(f => f.followingId.toString());
console.log(secondDegreeFollows,"secondDegreeFollows")
    // 3. Filter out already followed users and yourself
    const excludedIds = new Set([...directlyFollowedIds, userId]);
    console.log(excludedIds,"excludedIds")
    const recommendedIds = [...new Set(secondDegreeIds)];
console.log(recommendedIds,"recommendedIds")
    // 4. Separate user and business recommendations
    const userRecommendations = await registerModel.find({ _id: { $in: recommendedIds } })
      .select('_id full_Name profile_url username');

    const foundUserIds = userRecommendations.map(user => user._id.toString());
    const remainingIds = recommendedIds.filter(id => !foundUserIds.includes(id));

    const businessRecommendations = await businessRegisterModel.find({ _id: { $in: remainingIds } })
      .select('_id businessName brand_logo userId');
      
      console.log("User recommendations:", userRecommendations);
console.log("Business recommendations:", businessRecommendations);

    // 5. For each recommendation, get mutual followers and follower count
    const formattedUserRecs = await Promise.all(userRecommendations.map(async (user) => {
      // Get followers of this recommended user
      const followers = await Follow.find({ followingId: user._id });
      const followerIds = followers.map(f => f.userId.toString());
// console.log(formattedUserRecs,"formattedUserRecs")
      // Mutuals = intersection with your follows
      const mutualIds = followerIds.filter(followerId => directlyFollowedIds.includes(followerId));
console.log(mutualIds,"mutualIds")
      // Get details of mutuals
      const mutuals = await registerModel.find({ _id: { $in: mutualIds } })
        .select('_id full_Name profile_url');

      const mutualFollowers = mutuals.map(m => ({
        id: m._id,
        name: m.full_Name,
        profileImage: m.profile_url
      }));
console.log(mutualFollowers,"mutualFollowers")
      return {
        id: user._id,
        username: user.username || user.full_Name.toLowerCase().replace(/\s+/g, ''),
        fullName: user.full_Name,
        profileImage: user.profile_url,
        mutualFollowers,
        totalFollowers: followerIds.length
      };
    }));

    const formattedBusinessRecs = await Promise.all(businessRecommendations.map(async (biz) => {
      // Get followers of this business
      const followers = await Follow.find({ followingId: biz.userId });
      const followerIds = followers.map(f => f.userId.toString());

      // Mutuals = intersection
      const mutualIds = followerIds.filter(followerId => directlyFollowedIds.includes(followerId));

      const mutuals = await registerModel.find({ _id: { $in: mutualIds } })
        .select('_id full_Name profile_url');

      const mutualFollowers = mutuals.map(m => ({
        id: m._id,
        name: m.full_Name,
        profileImage: m.profile_url
      }));

      return {
        id: biz._id,
        username: biz.businessName.toLowerCase().replace(/\s+/g, ''),
        fullName: biz.businessName,
        profileImage: biz.brand_logo,
        mutualFollowers,
        totalFollowers: followerIds.length
      };
    }));

    // Combine and return
    const combined = [...formattedUserRecs, ...formattedBusinessRecs];

    res.status(200).json(combined);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
