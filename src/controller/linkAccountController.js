import User from "../model/registerModel.js";
import BusinessModel from "../model/BusinessModel.js";
import LinkAccountModel from "../model/LinkAccountModel.js";
import { handleSuccessV1, handleError } from "../utils/responseHandler.js";
import { sendPushNotification } from "../service/pushNotificationService.js";
import Notification from "../model/NotificationModel.js";
import adminService from "../service/adminService.js";


export const getLinkedAccounts = async (req, res) => {
    try {
        console.log("⏱️ getLinkedAccounts started at:", new Date().toISOString());
        const start = Date.now();
        console.time("⏱️ getLinkedAccounts duration");

        const { businessId } = req.query;

        if (!businessId) {
            return handleError(res, 400, "Business ID is required.");
        }

        const linkedAccounts = await LinkAccountModel.find({ linkingBusinessAccountId: businessId })
            .populate({
                path: "userId",
                select: "full_Name profile_url email"
            })
            .select("userId linkStatus");

        const linkedAccountUsers = linkedAccounts
            .filter(link => link.userId)
            .map(link => ({
                id: link.userId._id.toString(),
                name: link.userId.full_Name,
                imageUrl: link.userId.profile_url || null,
                email: link.userId.email || null,
                status: link.linkStatus
            }));

        const linkedUserIds = linkedAccountUsers.map(user => user.id);

        const business = await BusinessModel.findById(businessId).lean();
        if (!business) {
            return handleError(res, 404, "Business not found.");
        }

        const accessUserIds = (business.accessAccountsIds || []).filter(
            id => !linkedUserIds.includes(id.toString())
        );

        const accessUsers = await User.find({ _id: { $in: accessUserIds } })
            .select("full_Name profile_url email");

        const accessAccountUsers = accessUsers.map(user => ({
            id: user._id.toString(),
            name: user.full_Name,
            imageUrl: user.profile_url || null,
            email: user.email || null,
            status: "confirmed"
        }));

        const allUserIds = [
            ...linkedUserIds,
            ...accessAccountUsers.map(user => user.id)
        ];

        let businessOwner = null;
        const businessOwnerId = business.userId?.toString();

        if (businessOwnerId && !allUserIds.includes(businessOwnerId)) {
            const ownerUser = await User.findById(businessOwnerId).select("full_Name profile_url email");
            if (ownerUser) {
                businessOwner = {
                    id: ownerUser._id.toString(),
                    name: ownerUser.full_Name,
                    imageUrl: ownerUser.profile_url || null,
                    email: ownerUser.email || null,
                    status: "owner"
                };
            }
        }

        const combined = [
            ...linkedAccountUsers,
            ...accessAccountUsers,
            ...(businessOwner ? [businessOwner] : [])
        ];

        const response = combined.sort((a, b) => {
            const order = { owner: -1, confirmed: 0, pending: 1, rejected: 2 };
            return (order[a.status] ?? 3) - (order[b.status] ?? 3);
        });

        console.timeEnd("⏱️ getLinkedAccounts duration");
        console.log("✅ getLinkedAccounts completed in", Date.now() - start, "ms");

        return handleSuccessV1(
            res,
            200,
            response.length ? "Linked accounts retrieved successfully." : "No linked accounts found.",
            response
        );
    } catch (error) {
        console.error("❌ getLinkedAccounts failed:", error.message);
        return handleError(res, 500, error.message);
    }
};



export const linkAccount = async (req, res) => {
    try {
        const { userId, linkingBusinessAccountId } = req.body;

        if (!userId || !linkingBusinessAccountId) {
            return handleError(res, 400, "userId and linkingBusinessAccountId are required.");
        }

        // Check if the linking request already exists
        const existingLink = await LinkAccountModel.findOne({ userId, linkingBusinessAccountId });

        if (existingLink) {
            return handleError(res, 400, "A link request for this business account has already been sent. Please wait for approval.");
        }

        // Fetch User to get subscriptionIDs (player IDs for notifications)
        const user = await User.findById(userId).select("subscriptionIDs");
        const business = await BusinessModel.findById(linkingBusinessAccountId).select("brand_logo businessName");

        const validPlayerIds = user?.subscriptionIDs?.filter(id => id) || []; // Ensure valid IDs

        // Save Link Account request
        const newLink = new LinkAccountModel({
            userId, 
            linkingBusinessAccountId,
            linkStatus: "pending",
            trackInfo: [{ 
                userId, 
                linkingBusinessAccountId,
                status: "pending", 
                changedAt: new Date(),
                dateTime: new Date().toISOString()
            }]
        });

        await newLink.save();

        const notification = new Notification({
            userId,
            operationId: linkingBusinessAccountId,
            imageUrl: business?.brand_logo || null,
            isPerformAction:true,
            isPerformed:false,
            isBusinessTypeAccount:true,
            isRead:false,
            actions:["Accept","Reject"],
            title: "Business Account Link Request",
            message: `${business?.businessName || "A business account"} has requested to be linked to your profile. Review and take action.`,
            notificationType: "link_request"
        });

        await notification.save();

        // Send notification if valid player IDs exist
        if (validPlayerIds.length > 0) {
            const notificationPayload = { 
                playerIds: validPlayerIds, 
                title: "Business Account Link Request", 
                message: `${business?.businessName || "A business account"} has requested to be linked to your profile. Review and take action.`, 
                productImageUrl: null, 
                appLogoUrl: business?.brand_logo || null, 
            };
            sendPushNotification(notificationPayload);

            await User.findByIdAndUpdate(userId, { isThereAnyNotification: true });
        }
        

        return handleSuccessV1(res, 201, "Link request sent successfully.", newLink);
    } catch (error) {
        return handleError(res, 500, error.message);
    }
};

export const updateLinkStatus = async (req, res) => {
    try {
        const { userId, status, actionUserId } = req.body;

        if (!userId || !status || !['confirmed', 'rejected'].includes(status)) {
            return handleError(res, 400, "userId and valid status ('confirmed' or 'rejected') are required");
        }

        const updateData = {
            linkStatus: status,
            $push: {
                trackInfo: {
                    userId: actionUserId || userId,
                    status,
                    changedAt: new Date(),
                    dateTime: new Date().toISOString()
                }
            }
        };

        const linkRequest = await LinkAccountModel.findOneAndUpdate(
            { userId, linkStatus: "pending" },
            updateData,
            { new: true }
        );

        if (!linkRequest) {
            return handleError(res, 404, "Pending link request not found");
        }

        // If confirmed, update business account with access
        if (status === 'confirmed') {
            await adminService.addAccessIdToBusinessAccount({
                id: linkRequest.linkingBusinessAccountId,
                includeId: linkRequest.userId
            });
        }

        // Update notifications
        await Notification.updateMany(
            { userId: userId, isRead: false },
            {
                $set: {
                    isRead: true,
                    isPerformAction: true,
                    isPerformed: true
                }
            }
        );

        // Check for any remaining unread notifications
        const hasUnreadNotifications = await Notification.exists({
            userId: userId,
            isRead: false
        });

        await User.findByIdAndUpdate(userId, {
            isThereAnyNotification: !!hasUnreadNotifications
        });

        return handleSuccessV1(res, 200, `Link request ${status}`, linkRequest);
    } catch (error) {
        return handleError(res, 500, error.message);
    }
};





// Confirm Link - Change status to "confirmed"
export const confirmLink = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return handleError(res, 400, "userId is required");
        }

        const linkRequest = await LinkAccountModel.findOneAndUpdate(
            { userId, linkStatus: "pending" }, 
            { 
                linkStatus: "confirmed",
                $push: { trackInfo: { status: "confirmed", changedAt: new Date() } }
            },
            { new: true }
        );

        if (!linkRequest) {
            return handleError(res, 404, "Pending link request not found");
        }

        return handleSuccessV1(res, 200, "Link request confirmed", linkRequest);
    } catch (error) {
        return handleError(res, 500, error.message);
    }
};

// Reject Link - Change status to "rejected"
export const rejectLink = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return handleError(res, 400, "userId is required");
        }

        const linkRequest = await LinkAccountModel.findOneAndUpdate(
            { userId, linkStatus: "pending" }, 
            { 
                linkStatus: "rejected",
                $push: { trackInfo: { status: "rejected", changedAt: new Date() } }
            },
            { new: true }
        );

        if (!linkRequest) {
            return handleError(res, 404, "Pending link request not found");
        }

        return handleSuccessV1(res, 200, "Link request rejected", linkRequest);
    } catch (error) {
        return handleError(res, 500, error.message);
    }
};

export const fetchAllUsers = async (req, res) => {
    try {
        const { userId, searchQuery, isBusinessAccount } = req.query;

        if (!userId || !searchQuery) {
            return handleError(res, 400, "userId and searchQuery are required");
        }

        let excludedIds = [userId]; // Always exclude the current user
        let actualUserId = userId; // Default to userId

        if (isBusinessAccount === "true") {
            // If it's a business account, get the actual user_id
            const business = await BusinessModel.findOne({ _id: userId }).select("user_id accessAccountsIds");
            if (business) {
                actualUserId = business.user_id; // Owner of the business
                excludedIds.push(actualUserId, ...business.accessAccountsIds);
            }
        } else {
            // If it's a normal user, get accessAccountsIds
            const business = await BusinessModel.findOne({ user_id: userId }).select("accessAccountsIds");
            if (business) {
                excludedIds.push(...business.accessAccountsIds);
            }
        }

        // Perform efficient partial match in MongoDB, excluding accessAccountsIds
        const users = await User.find({
            _id: { $nin: excludedIds }, // Exclude determined IDs
            full_Name: { $regex: searchQuery, $options: "i" } // Case-insensitive partial match
        })
        .select("_id full_Name email profile_url")
        .limit(15); // Limit at DB level

        // Map the required fields for the response
        const response = users.map((user) => ({
            id: user._id,
            name: user.full_Name,
            email: user.email,
            imageUrl: user.profile_url,
        }));

        return handleSuccessV1(res, 200, "Users fetched successfully", response);
    } catch (error) {
        return handleError(res, 500, error.message);
    }
};
