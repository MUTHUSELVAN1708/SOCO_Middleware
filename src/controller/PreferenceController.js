import mongoose from "mongoose";
import Follow from "../model/FollowModel.js";
import Friend from "../model/FriendModel.js";
import User from "../model/registerModel.js";
import BusinessModel from "../model/BusinessModel.js";
import ChatMember from "../model/chatMembers.js";
import { handleSuccessV1, handleError } from "../utils/responseHandler.js";


export const addChatMember = async (req, res) => {
    try {
        console.log("Received request to add chat member with body:", req.body);

        const { userId, userReference, playerId, playerReference } = req.body;

        if (!userId || !userReference || !playerId || !playerReference) {
            console.error("Missing required fields:", { userId, userReference, playerId, playerReference });
            return handleError(res, 400, "Missing required fields");
        }

        const getUserDetails = async (id, reference) => {
            console.log(`Fetching details for ID: ${id}, Reference: ${reference}`);
            if (reference === "User") {
                return await User.findById(id).select("full_Name profile_url lastOnline");
            } else if (reference === "businessRegister") {
                return await BusinessModel.findById(id).select("businessName brand_logo lastOnline");
            }
            return null;
        };

        const userDetails = await getUserDetails(userId, userReference);
        const playerDetails = await getUserDetails(playerId, playerReference);

        if (!userDetails || !playerDetails) {
            console.error("User or Player not found:", { userDetails, playerDetails });
            return handleError(res, 404, "User or Player not found");
        }

        console.log("User details fetched:", userDetails);
        console.log("Player details fetched:", playerDetails);

        const addOrUpdateChatMember = async (ownerId, ownerReference, memberId, memberReference, details,isFirst) => {
            console.log(`Starting addOrUpdateChatMember function`);
            console.log(`Received Params - Owner ID: ${ownerId}, Owner Reference: ${ownerReference}, Member ID: ${memberId}, Member Reference: ${memberReference}, Details: ${JSON.stringify(details)}`);
        
            try {
                console.log(`Searching for chat member with Owner ID: ${ownerId}`);
                let chatMember = await ChatMember.findOne({ userId: ownerId });
        
                if (!chatMember) {
                    console.log(`Chat member not found for Owner ID: ${ownerId}. Creating new entry...`);
                
                    const name = isFirst 
                        ? userDetails?.full_Name ?? userDetails?.businessName ?? "Unknown"
                        : playerDetails?.full_Name ?? playerDetails?.businessName ?? "Unknown";
                
                    const avatarUrl = isFirst 
                        ? userDetails?.profile_url ?? userDetails?.brand_logo ?? ""
                        : playerDetails?.profile_url ?? playerDetails?.brand_logo ?? "";

                    const lastSeen = isFirst 
                        ? userDetails?.lastOnline ?? userDetails?.lastOnline ?? ""
                        : playerDetails?.lastOnline ?? playerDetails?.lastOnline ?? "";

                        
                
                    chatMember = new ChatMember({
                        userId: ownerId,
                        name,
                        avatarUrl,
                        lastSeen:lastSeen,
                        userReference: ownerReference,
                        player: [],
                    });
                
                    console.log(`New chat member entry created with User ID: ${ownerId}`);
                }
                 else {
                    console.log(`Existing chat member found for Owner ID: ${ownerId}`);
                }
        
                console.log(`Checking if member with ID: ${memberId} already exists in chatMember.player list`);
                const existingPlayerIndex = chatMember.player.findIndex(p => p.playerId === memberId);
        
                if (existingPlayerIndex !== -1) {
                    console.log(`Member with ID: ${memberId} already exists. Updating details...`);
                    chatMember.player[existingPlayerIndex] = {
                        ...chatMember.player[existingPlayerIndex],
                        playerId: memberId,
                        name: details?.full_Name || details?.businessName || "Unknown",
                        avatarUrl: details?.profile_url || details?.brand_logo || "",
                        playerReference: memberReference,
                        lastSeen: details?.lastSeen || details?.lastSeen || new Date(),
                    };
                    console.log(`Updated player details for Member ID: ${memberId}`);
                } else {
                    console.log(`Member with ID: ${memberId} does not exist. Adding new player entry...`);
                    chatMember.player.push({
                        playerId: memberId,
                        name: details?.full_Name || details?.businessName || "Unknown",
                        avatarUrl: details?.profile_url || details?.brand_logo || "",
                        playerReference: memberReference,
                        lastSeen: new Date(),
                        isOnline: false,
                        status: "Active",
                    });
                    console.log(`New player added with ID: ${memberId}`);
                }
        
                console.log(`Saving chat member data for Owner ID: ${ownerId}`);
                await chatMember.save();
                console.log(`Chat member saved successfully for Owner ID: ${ownerId}`);
            } catch (error) {
                console.error(`Error in addOrUpdateChatMember function: ${error.message}`);
            }
        
            console.log(`Completed addOrUpdateChatMember function`);
        };
        

        // Add userId as owner, playerId as member
        await addOrUpdateChatMember(userId, userReference, playerId, playerReference, playerDetails,true);
        // Add playerId as owner, userId as member (Reverse relationship)
        await addOrUpdateChatMember(playerId, playerReference, userId, userReference, userDetails,false);

        console.log("Chat members updated successfully");
        return handleSuccessV1(res, 200, "Chat members updated successfully");
    } catch (error) {
        console.error("Error in addChatMember:", error.message);
        return handleError(res, 500, error.message);
    }
};





// export const addChatMember = async (req, res) => {
//     try {
//         const { userId, userReference, playerId, playerReference } = req.body;

//         if (!userId || !userReference || !playerId || !playerReference) {
//             return handleError(res, "Missing required fields", 400);
//         }

//         const getUserDetails = async (id, reference) => {
//             if (reference === "User") {
//                 return await User.findById(id).select("name avatarUrl");
//             } else if (reference === "businessRegister") {
//                 return await BusinessModel.findById(id).select("name avatarUrl");
//             }
//             return null;
//         };

//         const userDetails = await getUserDetails(userId, userReference);
//         const playerDetails = await getUserDetails(playerId, playerReference);

//         if (!userDetails || !playerDetails) {
//             return handleError(res, "User or Player not found", 404);
//         }

//         const addOrUpdateChatMember = async (ownerId, memberId, memberRef, details) => {
//             let chatMember = await ChatMember.findOne({ userId: ownerId });
//             if (!chatMember) {
//                 chatMember = new ChatMember({
//                     userId: ownerId,
//                     name: userDetails.name,
//                     avatarUrl: userDetails.avatarUrl,
//                     userReference,
//                     player: [],
//                 });
//             }

//             const existingPlayerIndex = chatMember.player.findIndex(p => p.playerId === memberId);
//             if (existingPlayerIndex !== -1) {
//                 chatMember.player[existingPlayerIndex] = {
//                     ...chatMember.player[existingPlayerIndex],
//                     name: details.name,
//                     avatarUrl: details.avatarUrl,
//                     playerReference: memberRef,
//                     lastSeen: new Date(),
//                 };
//             } else {
//                 chatMember.player.push({
//                     playerId: memberId,
//                     name: details.name,
//                     avatarUrl: details.avatarUrl,
//                     playerReference: memberRef,
//                     lastSeen: new Date(),
//                     isOnline: false,
//                     status: "Active",
//                 });
//             }

//             await chatMember.save();
//         };

//         await addOrUpdateChatMember(userId, playerId, playerReference, playerDetails);
//         await addOrUpdateChatMember(playerId, userId, userReference, userDetails);

//         return handleSuccessV1(res, "Chat members updated successfully");
//     } catch (error) {
//         return handleError(res, error.message, 500);
//     }
// };


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




export { toggleFriend, toggleFollow , getFriendRequests , manageFriendStatus };
