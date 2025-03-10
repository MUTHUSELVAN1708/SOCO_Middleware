// import mongoose from "mongoose";
// import Order from "../model/orderModel.js";
// import Product from "../model/Product.js";
// import { handleSuccess, handleSuccessV1, handleError , generateTrackingNumber } from "../utils/responseHandler.js";
// import { sendPushNotification } from "../service/pushNotificationService.js";
// import BusinessModel from "../model/BusinessModel.js";

// ✅ Create New Order
// export const createOrder = async (req, res) => {
//     try {
//         console.log("Received request to create order:", req.body);

//         const { product_id, delivery_address_id, user_id } = req.body;

//         if (!product_id || !delivery_address_id || !user_id) {
//             console.error("Missing required fields:", { product_id, delivery_address_id, user_id });
//             return handleError(res, 400, "Missing required fields");
//         }

//         console.log("Fetching product details for product_id:", product_id);
//         const product = await Product.findById(product_id).populate('createdBy', 'Name Brand_Name');

//         if (!product) {
//             console.error("Product not found for ID:", product_id);
//             return handleError(res, 404, "Product not found");
//         }

//         const seller_id = '67c9e0436599aaf6db09029c';
//         console.log("Seller ID fetched:", seller_id);

//         // Generate tracking number
//         const trackingNumber = generateTrackingNumber();
//         console.log("Generated tracking number:", trackingNumber);

//         const newOrder = new Order({
//             user_id,
//             seller_id,
//             product_id,
//             delivery_address_id,
//             delivery_partner: {
//                 tracking_number: trackingNumber,
//             },
//         });

//         console.log("Saving new order to database...");
//         const savedOrder = await newOrder.save();
//         console.log("Order saved successfully with ID:", savedOrder._id);

//         // Prepare push notification details
//         const sellerName = product.createdBy.Brand_Name || product.createdBy.Name || 'Seller';
//         const notificationTitle = "New Order Received";
//         const notificationMessage = `You have received a new order for ${product.name}`;
        
//         // Additional data to include with the notification
//         const notificationData = {
//             order_id: savedOrder._id.toString(),
//             product_id: product_id,
//             screen: 'OrderDetails',
//             created_at: new Date().toISOString()
//         };

//         console.log("Sending push notification to seller ID:", seller_id);
//         await sendPushNotification(seller_id, notificationTitle, notificationMessage, notificationData);
//         console.log("Push notification sent successfully.");

//         return handleSuccessV1(res, 201, "Order placed successfully", savedOrder);
//     } catch (error) {
//         console.error("Error creating order:", error);
//         return handleError(res, 500, `Error creating order: ${error.message}`);
//     }
// };

import mongoose from "mongoose";
import Order from "../model/orderModel.js";
import Product from "../model/Product.js";
import { handleSuccess, handleSuccessV1, handleError , generateTrackingNumber } from "../utils/responseHandler.js";

// ✅ Create New Order
export const createOrder = async (req, res) => {
    try {
        const { product_id, delivery_address_id, user_id } = req.body;

        if (!product_id || !delivery_address_id || !user_id) {
            return handleError(res, 400, "Missing required fields");
        }

        // Fetch seller_id from Product model
        const product = await Product.findById(product_id);
        if (!product) {
            return handleError(res, 404, "Product not found");
        }

        const seller_id = product.createdBy;

        // Generate a better tracking number
        const trackingNumber = generateTrackingNumber();

        const newOrder = new Order({
            user_id,
            seller_id,
            product_id,
            delivery_address_id,
            delivery_partner: {
                tracking_number: trackingNumber,
            },
        });

        await newOrder.save();
        return handleSuccessV1(res, 201, "Order placed successfully", newOrder);
    } catch (error) {
        return handleError(res, 500, `Error creating order: ${error.message}`);
    }
};


// ✅ Get Order by ID
export const getOrderById = async (req, res) => {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return handleError(res, 400, "Invalid order ID");
    }

    try {
        const order = await Order.findById(orderId);
        if (!order) return handleError(res, 404, "Order not found");

        return handleSuccess(res, 200, "Order fetched successfully", order);
    } catch (error) {
        return handleError(res, 500, `Error fetching order: ${error.message}`);
    }
};

// ✅ Get All Orders for a User
export const getOrdersByUser = async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return handleError(res, 400, "Invalid user ID");
    }

    try {
        const orders = await Order.find({ user_id: userId });
        return handleSuccess(res, 200, "Orders retrieved", orders);
    } catch (error) {
        return handleError(res, 500, `Error fetching orders: ${error.message}`);
    }
};

// ✅ Update Order Status
export const updateOrderStatus = async (req, res) => {
    const { orderId } = req.params;
    const { order_status, seller_delivery_status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return handleError(res, 400, "Invalid order ID");
    }

    try {
        const order = await Order.findByIdAndUpdate(
            orderId,
            { order_status, seller_delivery_status },
            { new: true }
        );

        if (!order) return handleError(res, 404, "Order not found");

        return handleSuccess(res, 200, "Order status updated", order);
    } catch (error) {
        return handleError(res, 500, `Error updating order: ${error.message}`);
    }
};

// ✅ Delete Order
export const deleteOrder = async (req, res) => {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return handleError(res, 400, "Invalid order ID");
    }

    try {
        const order = await Order.findByIdAndDelete(orderId);
        if (!order) return handleError(res, 404, "Order not found");

        return handleSuccess(res, 200, "Order deleted successfully", order);
    } catch (error) {
        return handleError(res, 500, `Error deleting order: ${error.message}`);
    }
};
