import mongoose from "mongoose";
import Follow from "../model/FollowModel.js";
import Friend from "../model/FriendModel.js";
import User from "../model/registerModel.js";
import BusinessModel from "../model/BusinessModel.js";
import { handleSuccessV1, handleError } from "../utils/responseHandler.js";

const toggleFriend = async (req, res) => {
    const { userId, friends, isBusinessAccount } = req.body;

    if (!userId || !friends || friends.length === 0 || !friends[0].friendId || !friends[0].friendReference) {
        return handleError(res, 400, "Missing userId, friendId, or friendReference.");
    }

    const { friendId, friendReference } = friends[0];

    try {
        const userReference = isBusinessAccount ? "businessRegister" : "User";
        const friendModel = friendReference === "businessRegister" ? BusinessModel : User;
        const userModel = isBusinessAccount ? BusinessModel : User;

        const user = await userModel.findById(userId);
        const friendUser = await friendModel.findById(friendId);

        if (!user || !friendUser) {
            return handleError(res, 404, "User or friend does not exist.");
        }

        let friendData = await Friend.findOne({ userId });

        if (!friendData) {
            friendData = new Friend({
                userId,
                userReference,
                friends: [{ friendId, friendReference }],
                isBusinessAccount: isBusinessAccount || false
            });
            await friendData.save();
            return handleSuccessV1(res, 200, "Friend request initialized.");
        }

        const existingFriend = friendData.friends.some(f => f.friendId === friendId && f.friendReference === friendReference);

        if (existingFriend) {
            friendData.friends = friendData.friends.filter(f => f.friendId !== friendId || f.friendReference !== friendReference);
        } else {
            friendData.friends.push({ friendId, friendReference });
        }

        await friendData.save();

        return handleSuccessV1(res, 200, "Friend request toggled successfully.");
    } catch (error) {
        return handleError(res, 500, `Error toggling friend request: ${error.message}`);
    }
};




const toggleFollow = async (req, res) => {
    try {
        const { userId, targetUserId, fromAccount, targetAccount } = req.body;

        if (!userId || !targetUserId || !fromAccount || !targetAccount) {
            return handleError(res, 400, "Missing required fields.");
        }

        const userReference = fromAccount === "business" ? "businessRegister" : "User";
        const followingReference = targetAccount === "business" ? "businessRegister" : "User";

        const userModel = fromAccount === "business" ? BusinessModel : User;
        const targetModel = targetAccount === "business" ? BusinessModel : User;

        // Use a single query to check if both users exist
        const [user, targetUser] = await Promise.all([
            userModel.findById(userId),
            targetModel.findById(targetUserId),
        ]);

        if (!user || !targetUser) {
            return handleError(res, 404, "User or target user does not exist.");
        }

        // Use `findOneAndDelete` to check and remove the follow relationship in one step
        const existingFollow = await Follow.findOneAndDelete({ userId, followingId: targetUserId });

        if (existingFollow) {
            // Atomic decrement of counters using `$inc`
            await Promise.all([
                userModel.updateOne({ _id: userId }, { $inc: { followingCount: -1 } }),
                targetModel.updateOne({ _id: targetUserId }, { $inc: { followerCount: -1 } }),
            ]);

            return handleSuccessV1(res, 200, "Unfollowed successfully", {});
        }

        // If not following, proceed to follow in a single step
        const newFollow = new Follow({ userId, followingId: targetUserId, userReference, followingReference });
        await newFollow.save();

        // Atomic increment of counters using `$inc`
        await Promise.all([
            userModel.updateOne({ _id: userId }, { $inc: { followingCount: 1 } }),
            targetModel.updateOne({ _id: targetUserId }, { $inc: { followerCount: 1 } }),
        ]);

        return handleSuccessV1(res, 200, "Followed successfully", newFollow);
    } catch (error) {
        console.error("Error:", error);
        return handleError(res, 500, `Error updating follow status: ${error.message}`);
    }
};

const getFriendRequests = async (req, res) => {
    try {
        const { userId, page = 1, limit = 10 } = req.query;

        if (!userId) {
            console.log("[Error] Missing userId in request.");
            return handleError(res, 400, "Missing userId.");
        }

        const currentPage = Math.max(1, parseInt(page, 10));
        const perPage = Math.max(1, parseInt(limit, 10));

        console.log(`[Info] Fetching pending friend requests for userId: ${userId}, Page: ${currentPage}, Limit: ${perPage}`);

        // Find users where `userId` exists inside their `friends` array with status "Pending"
        console.log(`[DB Query] Searching for pending requests where userId exists in friends list.`);
        const pendingRequests = await Friend.aggregate([
            { $match: { "friends.friendId": userId, "friends.status": "Pending" } },
            { $unwind: "$friends" },
            { $match: { "friends.friendId": userId, "friends.status": "Pending" } },
            {
                $project: {
                    _id: "$friends._id",
                    requesterId: "$userId",
                    friendId: "$friends.friendId",
                    friendReference: "$userReference",
                    requestedAt: "$friends.requestedAt"
                }
            },
            { $sort: { requestedAt: -1 } },
            { $skip: (currentPage - 1) * perPage },
            { $limit: perPage }
        ]);

        console.log(`[DB Result] Found ${pendingRequests.length} pending requests for userId: ${userId}`);

        if (!pendingRequests.length) {
            console.log("[Info] No pending friend requests found.");
            return handleSuccessV1(res, 200, "No pending friend requests found.", { requests: [], pagination: null });
        }

        const userIds = [];
        const businessIds = [];
        const requestMap = new Map();

        pendingRequests.forEach(request => {
            requestMap.set(request.requesterId, request.requestedAt);
            if (request.friendReference === "User") {
                userIds.push(request.requesterId);
            } else if (request.friendReference === "businessRegister") {
                businessIds.push(request.requesterId);
            }
        });

        console.log(`[Info] Categorizing requests: ${userIds.length} User requests, ${businessIds.length} Business requests`);

        console.log(`[DB Query] Fetching User details...`);
        const users = await User.find({ _id: { $in: userIds } }, "full_Name profile_url").lean();
        console.log(`[DB Result] Found ${users.length} Users.`);

        console.log(`[DB Query] Fetching Business details...`);
        const businesses = await BusinessModel.find({ _id: { $in: businessIds } }, "businessName brand_logo").lean();
        console.log(`[DB Result] Found ${businesses.length} Businesses.`);

        const userMap = new Map(users.map(user => [user._id.toString(), { name: user.full_Name, imageUrl: user.profile_url }]));
        const businessMap = new Map(businesses.map(business => [business._id.toString(), { name: business.businessName, imageUrl: business.brand_logo }]));

        console.log("[Processing] Formatting friend requests...");
        const formattedRequests = await Promise.all(
            pendingRequests.map(async request => {
                const details = userMap.get(request.requesterId) || businessMap.get(request.requesterId) || {};
                const mutualFriendsCount = await calculateMutualFriends(userId, request.requesterId);

                return {
                    _id: request._id,
                    friendId: request.requesterId,
                    name: details.name || "Unknown",
                    imageUrl: details.imageUrl || "",
                    requestDate: new Date(requestMap.get(request.requesterId)).toISOString(),
                    mutualFriendsCount: `${mutualFriendsCount} mutual friends`
                };
            })
        );

        console.log("[DB Query] Counting total pending requests...");
        const totalResults = await Friend.countDocuments({ "friends.friendId": userId, "friends.status": "Pending" });
        const totalPages = Math.ceil(totalResults / perPage);
        
        console.log(`[Info] Pagination - Total Results: ${totalResults}, Total Pages: ${totalPages}, Current Page: ${currentPage}`);

        const pagination = {
            totalResults,
            totalPages,
            currentPage,
            limit: perPage,
            hasNextPage: currentPage < totalPages,
            hasPreviousPage: currentPage > 1
        };

        console.log("[Success] Sending formatted friend requests.");
        return handleSuccessV1(res, 200, "Pending friend requests retrieved successfully.", {
            requests: formattedRequests,
            pagination
        });

    } catch (error) {
        console.error("[Error] Fetching friend requests failed:", error);
        return handleError(res, 500, `Error fetching friend requests: ${error.message}`);
    }
};


// Function to calculate mutual friends
const calculateMutualFriends = async (userId, friendId) => {
    try {
        console.log(`Calculating mutual friends between ${userId} and ${friendId}`);

        const userFriends = await Friend.findOne({ userId }).lean();
        const friendFriends = await Friend.findOne({ userId: friendId }).lean();

        if (!userFriends || !friendFriends) {
            console.log("One or both users have no friends.");
            return 0;
        }

        const userFriendIds = new Set(userFriends.friends.filter(f => f.status === "Accepted").map(f => f.friendId));
        const friendFriendIds = new Set(friendFriends.friends.filter(f => f.status === "Accepted").map(f => f.friendId));

        const mutualCount = [...userFriendIds].filter(id => friendFriendIds.has(id)).length;
        
        console.log(`Mutual Friends Count: ${mutualCount}`);
        return mutualCount;
    } catch (error) {
        console.error("Error calculating mutual friends:", error);
        return 0;
    }
};


const manageFriendStatus = async (req, res) => {
    const { id, status } = req.body;

    if (!id || !status) {
        return handleError(res, 400, "Missing friendId or status.");
    }

    try {
        const friendData = await Friend.findOne({ "friends._id": id });
        if (!friendData) return handleError(res, 404, "Friend data not found.");

        const friend = friendData.friends.find(f => f._id.toString() === id);
        if (!friend) return handleError(res, 400, "Friend not found.");

        if (status === "Accepted") {
            if (friend.status !== "Pending") return handleError(res, 400, "No pending friend request found.");

            friend.status = "Accepted";
            friend.acceptedAt = new Date();
            await friendData.save();

            const updateModel = friend.friendReference === "businessRegister" ? BusinessModel : User;
            await updateModel.findByIdAndUpdate(friend.friendId, { $inc: { friendCount: 1 } });

            return handleSuccessV1(res, 200, "Friend request accepted.");
        }

        if (status === "Rejected") {
            if (friend.status !== "Pending") return handleError(res, 400, "No pending friend request found.");

            friend.status = "Rejected";
            friend.rejectedAt = new Date();
            await friendData.save();

            return handleSuccessV1(res, 200, "Friend request rejected.");
        }

        if (status === "Removed") {
            if (friend.status !== "Accepted") return handleError(res, 400, "Friend not found or not accepted.");

            friendData.friends = friendData.friends.filter(f => f._id.toString() !== id);
            await friendData.save();

            const updateModel = friend.friendReference === "businessRegister" ? BusinessModel : User;
            await updateModel.findByIdAndUpdate(friend.friendId, { $inc: { friendCount: -1 } });

            return handleSuccessV1(res, 200, "Friend removed successfully.");
        }

        return handleError(res, 400, "Invalid status provided.");
    } catch (error) {
        return handleError(res, 500, `Error managing friend status: ${error.message}`);
    }
};




export { toggleFriend, toggleFollow , getFriendRequests , manageFriendStatus};
