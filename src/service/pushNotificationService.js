import axios from "axios";

import User from "../model/registerModel.js";
import BusinessModel from "../model/BusinessModel.js";

const ONE_SIGNAL_API_URL = "https://onesignal.com/api/v1/notifications";
const ONE_SIGNAL_APP_ID = "5e250119-1cc5-42e6-ab67-43d03443819b";
const ONE_SIGNAL_API_KEY = "os_v2_app_lysqcgi4yvbonk3hipidiq4btnv7wmh7itceqvmq4br2dzmibrxlnv4wx6dxw2k3r65mq4vvsqwqjx2aquostov2i4brvf5dlr3pzea";

/**
 * Send a push notification using OneSignal with properly configured icons for Flutter
 * and support for expanded text messages
 * @param {Object} payload - Notification payload
 * @param {Array} payload.playerIds - Array of OneSignal player IDs
 * @param {string} payload.title - Notification title
 * @param {string} payload.appLogoUrl - application logo url
 * @param {string} payload.message - Notification message
 * @param {string} [payload.productImageUrl] - URL to the product image
 * @param {Object} [payload.additionalData] - Additional data to send with notification
 */
export const sendPushNotification = async ({userId,
    playerIds,
    title,
    message,
    productImageUrl,
    appLogoUrl,
    additionalData = {}
}) => {
    // const appLogoUrl = "http://192.168.1.33:2007/uploads/1740664119907-scaled_download%20(1).png";
    
    try {
        const notificationPayload = {
            app_id: ONE_SIGNAL_APP_ID,
            include_player_ids: playerIds,
            headings: { en: title },
            contents: { en: message },
            data: {
                ...additionalData,
                timestamp: new Date().toISOString()
            },
            
            android_group: title,
            big_picture: productImageUrl || null,
            
            big_text: message,
            
            android_accent_color: "FFFFFF",
            small_icon: "ic_notification_icon",
            large_icon: appLogoUrl,
            
            
            ios_badgeType: "Increase",
            ios_badgeCount: 1,
            ios_attachments: productImageUrl ? { "id1": productImageUrl } : undefined,
            
          
            
            chrome_web_icon: appLogoUrl,
            firefox_icon: appLogoUrl,
            
            priority: 10,
            ttl: 259200,
            
            // Optional buttons
            buttons: [
                { id: "view", text: "View Details" }
            ]
        };
        
        const response = await axios.post(
            ONE_SIGNAL_API_URL,
            notificationPayload,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Basic ${ONE_SIGNAL_API_KEY}`,
                },
            }
        );

        if (response.data.errors?.invalid_player_ids?.length) {
            const invalidIds = response.data.errors.invalid_player_ids;
            
            // Update both User and BusinessModel
            await Promise.all([
                updateModel(User, invalidIds),
                updateModel(BusinessModel, invalidIds)
            ]);
        }
        
        console.log("✅ Enhanced Push Notification Sent:", response.data);
        return { success: true, data: response.data };
    } catch (error) {
        console.error("❌ Error Sending Notification:", error.response?.data || error.message);
        throw new Error(`Notification failed: ${error.response?.data?.errors?.[0] || error.message}`);
    }
};

/**
 * Removes invalid subscription IDs and their corresponding oneSignalIDs
 * @param {Object} model - Mongoose model (User or BusinessModel)
 * @param {Array} invalidIds - Array of invalid OneSignal player IDs
 */
const updateModel = async (model, invalidIds) => {
    const users = await model.find({
        subscriptionIDs: { $in: invalidIds }
    });

    for (const user of users) {
        let updatedSubscriptionIDs = [...user.subscriptionIDs];
        let updatedOneSignalIDs = [...user.oneSignalIDs];

        invalidIds.forEach((invalidId) => {
            const index = updatedSubscriptionIDs.indexOf(invalidId);
            if (index !== -1) {
                updatedSubscriptionIDs.splice(index, 1);
                updatedOneSignalIDs.splice(index, 1);
            }
        });

        await model.updateOne(
            { _id: user._id },
            {
                $set: {
                    subscriptionIDs: updatedSubscriptionIDs,
                    oneSignalIDs: updatedOneSignalIDs
                }
            }
        );
    }
};