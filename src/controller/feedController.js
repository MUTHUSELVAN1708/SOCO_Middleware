import createPostModel from "../model/createPostModel.js";
import trackingModel from "../model/TrackingModel.js";
import businessregisterModel from "../model/BusinessModel.js";
import registerModel from "../model/registerModel.js";
import followerModel from "../model/followerModel.js";
import mongoose from "mongoose";

export const getDashboardFeed = async (req, res) => {
    try {
        const {
            user_id,
            lat,
            lon,
            pincode,
            address,
            isBusinessAccount,
            page = 1,
            limit: requestedLimit = 15
        } = req.body;
console.log(req.body,"body")
        const limit = 15;
        let user = isBusinessAccount
            ? await businessregisterModel.findOne({user_id})
            : await registerModel.findById(user_id);

        console.log(user, "user")
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const tracking = await trackingModel.findOne({
            user_id: new mongoose.Types.ObjectId(user_id)
        });
        console.log(tracking, "tracking")

        const trackedPostIds = tracking?.sentPosts?.map(post =>
            new mongoose.Types.ObjectId(post.post_id)
        ) || [];

        console.log(trackedPostIds, "trackedPostIds")
        const baseFilters = {
            status: "published",
            // isProductPost: false,
            creator_id: { $ne: user_id },
            _id: { $nin: trackedPostIds }
        };

        console.log(baseFilters, "baseFilters");

        const following = await followerModel.find({ follower_id: user_id })
            .select('following_id')
            .limit(100);
        const followingIds = following.map(f => f.following_id);
        console.log(following, "following")
        let posts = [];
        const baseSelect = "creatorName creatorProfileImageUrl completeAddress tags isVideo mediaFile thumbnailFile aspectRatio description caption timestamp creator_id likesCount viewsCount state pinCode language commentsCount user_id _id isProductPost isUserPost isBusinessPost productId ";
        // console.log(baseSelect, "baseSelect")
        if (followingIds.length) {
            const followingPosts = await createPostModel.find({
                ...baseFilters,
                creator_id: { $in: followingIds },
                language: { $in: [...(user.languages || []), null] }
            })
                .sort({ timestamp: -1 })
                .limit(Math.ceil(limit * 0.25))
                .select(baseSelect);

            posts = [...posts, ...followingPosts];
            console.log(followingPosts,"followingPosts")
        }

        if (posts.length < limit && pincode) {
            const pincodeVariations = generateNeighboringPincodes(pincode);
            const locationPosts = await createPostModel.find({
                ...baseFilters,
                _id: { $nin: [...trackedPostIds, ...posts.map(p => p._id)] },
                $or: [
                    {
                        pinCode: { $in: pincodeVariations },
                        language: { $in: user.languages || [] }
                    },
                    {
                        state: user.state,
                        language: { $in: user.languages || [] }
                    },
                    {
                        completeAddress: { $regex: escapeRegExp(address), $options: "i" }
                    }
                ]
            })
                .sort({ timestamp: -1, viewsCount: -1 })
                .limit(Math.ceil((limit - posts.length) * 0.35))
                .select(baseSelect);

            posts = [...posts, ...locationPosts];
        }

        if (posts.length < limit && user.interest?.length) {
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const trendingPosts = await createPostModel.find({
                ...baseFilters,
                _id: { $nin: [...trackedPostIds, ...posts.map(p => p._id)] },
                $or: [
                    { tags: { $in: user.interest } },
                    { description: { $regex: user.interest.join("|"), $options: "i" } }
                ],
                language: { $in: [...(user.languages || []), null] },
                timestamp: { $gte: weekAgo }
            })
                .sort({ viewsCount: -1, likesCount: -1 })
                .limit(limit - posts.length)
                .select(baseSelect);

            posts = [...posts, ...trendingPosts];
            console.log(posts,"po post")
            
        }
        if (posts.length < limit) {
            const fallbackPosts = await createPostModel.find({
                ...baseFilters,
                _id: { $nin: [...trackedPostIds, ...posts.map(p => p._id)] },
                language: { $in: [...(user.languages || []), null] }
            })
                .sort({ viewsCount: -1, timestamp: -1 })
                .limit(limit - posts.length)
                .select(baseSelect);

            posts = [...posts, ...fallbackPosts];
        }

        posts = shuffleArray(posts);
        console.log(posts, "posts")
        if (posts.length > 0) {
            const bulkOps = posts.map(post => ({
                updateOne: {
                    filter: { _id: post._id },
                    update: { $inc: { viewsCount: 1 } }
                }
            }));

            await createPostModel.bulkWrite(bulkOps);
        }

        const newViewedPosts = posts.map(post => ({
            post_id: post._id,
            viewedAt: new Date(),
            isWatched: false
        }));
        console.log(newViewedPosts, "newViewedPosts")
        if (newViewedPosts.length > 0) {
            await trackingModel.updateOne(
                { user_id: new mongoose.Types.ObjectId(user_id) },
                {
                    $push: {
                        sentPosts: {
                            $each: newViewedPosts,
                            $sort: { viewedAt: -1 },
                            $slice: 1000
                        }
                    }
                },
                { upsert: true }
            );
        }

        return res.json({
            posts,
            pagination: {
                currentPage: page,
                hasNextPage: posts.length === limit,
                limit,
                total: posts.length
            }
        });
    } catch (error) {
        console.error("Error fetching dashboard feed:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

function generateNeighboringPincodes(pincode) {
    const pincodeNum = parseInt(pincode);
    return [pincodeNum, pincodeNum - 1, pincodeNum + 1, pincodeNum - 2, pincodeNum + 2].map(num => num.toString().padStart(6, '0'));
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}