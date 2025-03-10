import axios from 'axios';
import Notification from '../model/orderNotificationModel.js';
import BusinessModel from '../model/BusinessModel.js';

const ONESIGNAL_APP_ID = '46e90495-8cb8-4500-ae91-90edb10dd101'; 
const ONESIGNAL_API_KEY = 'os_v2_app_i3uqjfmmxbcqblursdw3cdorafyrqb7hkaoeyv5yajysegzauje6orn5rqc5cqselsezfreyrd2rbvo46hpuq4j7hwjmn6ffxl5nv7i'; 

// Store device tokens
export const registerDeviceToken = async (userId, deviceToken, deviceType) => {
  try {
    await BusinessModel.findByIdAndUpdate(userId, {
      $set: {
        deviceToken,
        deviceType // 'android' or 'ios'
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Error registering device token:', error);
    throw error;
  }
};

// Send push notification
export const sendPushNotification = async (recipientId, title, message, data = {}) => {
  try {
    // First, find the seller and get their device token
    const seller = await BusinessModel.findById(recipientId);
    if (!seller || !seller.deviceToken) {
      console.log(`No device token found for seller: ${recipientId}`);
      return false;
    }

    // OneSignal notification payload
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [seller.deviceToken],
      headings: { en: title },
      contents: { en: message },
      data: data,
      android_channel_id: "order_notifications",
      ios_sound: "notification.wav",
      android_sound: "notification"
    };

    // Send to OneSignal
    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_API_KEY}`
        }
      }
    );

    if (response.status === 200) {
      console.log('Push notification sent successfully');
      
      // Also save the notification in our database
      const notification = new Notification({
        recipient_id: recipientId,
        recipient_type: 'seller',
        title,
        message,
        order_id: data.order_id,
        product_id: data.product_id
      });
      await notification.save();
      
      return true;
    } else {
      console.error('Failed to send push notification:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
};