import Notification from "../model/NotificationModel.js";
// import User from "../model/registerModel.js";
// import BusinessModel from "../model/BusinessModel.js";
import { handleSuccessV1, handleError } from "../utils/responseHandler.js";

export const getNotifications = async (req, res) => {
  try {
    const { userId, page = 1, limit = 15 } = req.query;

    if (!userId) {
      return handleError(res, 400, "Operation ID is required.");
    }

    const query = {
      userId,
      // isRead: false,
      isPerformed: false
    };

    const pageNumber = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);

    const totalResults = await Notification.countDocuments(query);
    const totalPages = Math.ceil(totalResults / pageSize);
    const hasNextPage = pageNumber < totalPages;
    const hasPreviousPage = pageNumber > 1;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * pageSize)
      .limit(pageSize);

    return handleSuccessV1(res, 200, "Notifications fetched successfully", {
      notifications,
      pagination: {
        totalResults,
        totalPages,
        currentPage: pageNumber,
        limit: pageSize,
        hasNextPage,
        hasPreviousPage
      }
    });
  } catch (error) {
    return handleError(res, 500, error.message);
  }
};
