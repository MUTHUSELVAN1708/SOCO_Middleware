import Notification from "../model/orderNotificationModel.js";

export const createNotification = async (data) => {
  try {
    const notification = new Notification(data);
    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

export const getNotificationsByRecipient = async (recipient_id, recipient_type) => {
  try {
    const notifications = await Notification.find({ 
      recipient_id, 
      recipient_type 
    }).sort({ timestamp: -1 });
    return notifications;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
};

export const markNotificationAsRead = async (notification_id) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      notification_id,
      { read: true },
      { new: true }
    );
    return notification;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};