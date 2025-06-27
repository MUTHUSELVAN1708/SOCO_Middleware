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
import User from "../model/registerModel.js";
import BusinessModel from "../model/BusinessModel.js";
import moment from "moment-timezone";
import DeliveryAddressModel from "../model/deliveryAddressModel.js";
import { handleSuccess, handleSuccessV1, handleError, generateTrackingNumber } from "../utils/responseHandler.js";
import { sendPushNotification } from "../service/pushNotificationService.js";

import { v4 as uuidv4, validate as isValidUUID } from "uuid";
import orderEmailController from "./orderEmailController.js";
import registerModel from "../model/registerModel.js";
import businessregisterModel from "../model/BusinessModel.js";
import { storeNotificationMessage } from "../controller/linkAccountController.js"

export const getOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.query;

        if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
            return handleError(res, 400, "Invalid order ID");
        }

        const order = await Order.findOne({ _id: orderId }).populate("product_id");

        if (!order) {
            return handleError(res, 404, "Order not found");
        }

        const product = await Product.findById(order.product_id);

        const orderDetails = {
            orderId: order._id,
            userId: order.user_id,
            sellerId: order.seller_id,
            product: product ? {
                productId: product._id,
                name: product.basicInfo?.productTitle || "Unknown Product",
                price: product.pricing?.salePrice || product.pricing?.regularPrice || "N/A",
                currency: product.pricing?.currency || "INR",
                image: product.images?.[0] || "",
            } : null,
            status: order.order_status,
            totalPrice: order.total_price,
            paymentStatus: order.payment_status,
            paymentMode: order.payment_mode,
            deliveryType: order.delivery_type,
            deliveryMethod: order.delivery_method,
            deliveryCharge: order.delivery_charge,
            deliveryPartner: order.delivery_partner?.tracking_number || "N/A",
            deliveryAddressId: order.delivery_address_id,
            returnType: order.return_type,
            needsSignature: order.needs_signature,
            isFragile: order.is_fragile,
            estimatedDeliveryDate: order.estimated_delivery_date,
            sellerReviewStatus: order.seller_review_status,
            buyerApprovalStatus: order.buyer_approval_status,
            sellerDeliveryStatus: order.seller_delivery_status,
            specialInstructions: order.special_instructions || "",
            trackingInfo: order.tracking_info || [],
            createdAt: order.created_at,
            deliveryTimeInDays: order.deliveryTimeInDays,
            is_Shipped: order.is_Shipped,
            is_Delivered: order.is_Delivered,
        };

        return handleSuccessV1(res, 200, "Order retrieved successfully", orderDetails);
    } catch (error) {
        return handleError(res, 500, `Error fetching order: ${error.message}`);
    }
};




export const cancelOrderByUser = async (req, res) => {
    try {
        const { userId, orderId, cancelReason } = req.body;

        if (!userId || !orderId) {
            return handleError(res, 400, "Missing required fields: userId or orderId");
        }

        const order = await Order.findOne({ _id: orderId, user_id: userId });

        if (!order) {
            return handleError(res, 404, "Order not found");
        }

        const product = await Product.findById(order.product_id);
        console.log(product, "product")
        if (!product) {
            return handleError(res, 404, "Product not found");
        }
        if (order.order_status !== "Pending") {
            return handleError(res, 400, `Sorry, the order cannot be canceled as its status has changed to ${order.order_status}.`);
        }

        order.order_status = "Cancelled";
        order.buyer_approval_status = "Rejected";

        if (cancelReason) {
            order.cancel_reason_by_buyer = cancelReason;
        }

        order.tracking_info.push({ status: "Cancelled", timestamp: moment().tz("Asia/Kolkata").toDate() });

        await order.save();
        const business = await BusinessModel.findById(product.createdBy);
        console.log(business, "business")
        const validPlayerIds = (business?.subscriptionIDs || []).filter(id => isValidUUID(id));


        if (validPlayerIds.length === 0) {
            return handleError(res, 400, "Invalid or missing player_id(s) for push notifications");
        }

        console.log(validPlayerIds);

        const notificationPayload = {
            userId: userId,
            playerIds: validPlayerIds,
            title: "Order Cancelled ✅",
            message: `The order for ${product.basicInfo.productTitle.trim()} has been cancelled by the buyer. Please check for further details.`,
            productImageUrl: product.images?.length > 0 ? product.images[0] : null,
        };

        sendPushNotification(notificationPayload);
        const email = business.businessEmail;
        const productTitle = product.basicInfo.productTitle;
        orderEmailController.cancelOrderByuserEmail(email, productTitle, orderId, cancelReason);

        storeNotificationMessage(notificationPayload);
        return handleSuccessV1(res, 200, "Order canceled successfully", order);
    } catch (error) {
        return handleError(res, 500, `Error canceling order: ${error.message}`);
    }
};

// Confirm Order by User
export const confirmOrderByUser = async (req, res) => {
    try {
        const { userId, orderId } = req.body;

        if (!userId || !orderId) {
            return handleError(res, 400, "Missing required fields: userId or orderId");
        }

        const order = await Order.findOne({ _id: orderId, user_id: userId });

        if (!order) {
            return handleError(res, 404, "Order not found");
        }
        const product = await Product.findById(order.product_id);
        console.log(product, "product")
        if (!product) {
            return handleError(res, 404, "Product not found");
        }
        // if (order.order_status !== "Pending") {
        //     return handleError(res, 400, `Order status has already changed to ${order.order_status}. Confirmation is not allowed.`);
        // }

        order.order_status = "Confirmed";
        order.buyer_approval_status = "Accepted";

        order.tracking_info.push({ status: "The creator has confirmed this product for the order", timestamp: moment().tz("Asia/Kolkata").toDate() });

        await order.save();
        const business = await BusinessModel.findById(product.createdBy);
        console.log(business, "business")
        const validPlayerIds = (business?.subscriptionIDs || []).filter(id => isValidUUID(id));

        // Move this check **after** validPlayerIds is initialized
        if (validPlayerIds.length === 0) {
            return handleError(res, 400, "Invalid or missing player_id(s) for push notifications");
        }

        console.log(validPlayerIds);

        const notificationPayload = {
            userId: userId,
            playerIds: validPlayerIds,
            title: "Order Initiated ✅",
            message: `The order for ${product.basicInfo.productTitle.trim()} has been confirmed by the customer. Get ready to process it!`,
            productImageUrl: product.images?.length > 0 ? product.images[0] : null,
        };


        sendPushNotification(notificationPayload);
        storeNotificationMessage(notificationPayload);

        return handleSuccessV1(res, 200, "Order confirmed successfully", order);
    } catch (error) {
        return handleError(res, 500, `Error confirming order: ${error.message}`);
    }
};

// Reject Order by User
export const rejectOrderByUser = async (req, res) => {
    try {
        const { userId, orderId, rejectReason } = req.body;

        if (!userId || !orderId || !rejectReason) {
            return handleError(res, 400, "Missing required fields: userId, orderId, or rejectReason");
        }

        const order = await Order.findOne({ _id: orderId, user_id: userId });

        if (!order) {
            return handleError(res, 404, "Order not found");
        }
        const product = await Product.findById(order.product_id);
        console.log(product, "product")
        if (!product) {
            return handleError(res, 404, "Product not found");
        }
        // if (order.order_status !== "Pending") {
        //     return handleError(res, 400, `Order status has already changed to ${order.order_status}. Rejection is not allowed.`);
        // }

        order.order_status = "Rejected";
        order.buyer_approval_status = "Rejected";
        order.reject_reason_by_buyer = rejectReason;

        order.tracking_info.push({ status: "Rejected by order creator", timestamp: moment().tz("Asia/Kolkata").toDate(), reason: rejectReason });

        await order.save();
        const business = await BusinessModel.findById(product.createdBy);
        console.log(business, "business")
        const validPlayerIds = (business?.subscriptionIDs || []).filter(id => isValidUUID(id));

        // Move this check **after** validPlayerIds is initialized
        if (validPlayerIds.length === 0) {
            return handleError(res, 400, "Invalid or missing player_id(s) for push notifications");
        }

        console.log(validPlayerIds);

        const notificationPayload = {
            userId: userId,
            playerIds: validPlayerIds,
            title: "Order Rejected",
            message: `Your order for ${product.basicInfo.productTitle.trim()} has been rejected by the buyer. Please check your dashboard for details.`,
            productImageUrl: product.images?.length > 0 ? product.images[0] : null,
        };


        sendPushNotification(notificationPayload);
        const email = business.businessEmail;
        const productTitle = product.basicInfo.productTitle;
        orderEmailController.cancelOrderByuserEmail(email, productTitle, orderId, rejectReason);
        storeNotificationMessage(notificationPayload);

        return handleSuccessV1(res, 200, "Order rejected successfully", order);
    } catch (error) {
        return handleError(res, 500, `Error rejecting order: ${error.message}`);
    }
};

export const getPendingApprovedOrderList = async (req, res) => {
    try {
        console.log("Received request for pending and approved orders:", req.query);

        const { user_id, page = 1, limit = 10 } = req.query;

        if (!user_id) {
            console.error("Missing required field: user_id");
            return handleError(res, 400, "Missing required field: user_id");
        }

        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);
        const skip = (pageNumber - 1) * pageSize;

        console.log(`Fetching orders for user_id: ${user_id}, Page: ${pageNumber}, Limit: ${pageSize}, Skip: ${skip}`);

        // Updated query filter to include both "Accepted" and "Pending" orders
        const queryFilter = { user_id, order_status: { $in: ["Pending", "Accepted"] } };

        const totalItems = await Order.countDocuments(queryFilter);
        console.log(`Total orders found: ${totalItems}`);

        const totalPages = Math.ceil(totalItems / pageSize);

        const orders = await Order.find(queryFilter)
            .skip(skip)
            .limit(pageSize)
            .populate("product_id")
            .populate("delivery_address_id");

        console.log(`Orders fetched: ${orders.length}`);

        const orderRequests = await Promise.all(
            orders.map(async (order) => {
                console.log(`Processing order ID: ${order._id}`);

                const product = await Product.findById(order.product_id);
                if (!product) {
                    console.warn(`Product not found for product_id: ${order.product_id}`);
                }

                const address = await DeliveryAddressModel.findById(order.delivery_address_id);
                if (!address) {
                    console.warn(`Address not found for address_id: ${order.delivery_address_id}`);
                }

                let finalPrice = parseFloat(product?.pricing?.salePrice || product?.pricing?.regularPrice || "0");
                if (product?.pricing?.gstDetails?.gstIncluded) {
                    finalPrice += (finalPrice * product.pricing.gstDetails.gstPercentage) / 100;
                }
                if (product?.pricing?.additionalTaxes?.length > 0) {
                    product.pricing.additionalTaxes.forEach(tax => {
                        finalPrice += (finalPrice * tax.percentage) / 100;
                    });
                }
                finalPrice = parseFloat(finalPrice.toFixed(2));

                console.log(`Final price calculated for product_id ${product?._id}: ${finalPrice}`);

                const orderTotalPrice = parseFloat(order.total_price);
                const isIncrement = orderTotalPrice > finalPrice;
                const priceDifference = Math.abs(orderTotalPrice - finalPrice).toFixed(2);
                const percentageDifference = ((priceDifference / finalPrice) * 100).toFixed(2);

                // Calculate estimated delivery date
                const currentDate = new Date();
                const estimatedDeliveryDate = new Date(currentDate.setDate(currentDate.getDate() + (order.deliveryTimeInDays || 0))).toISOString().split("T")[0];

                return {
                    id: order._id,
                    trackId: order.delivery_partner?.tracking_number || "N/A",
                    delivery_type: order.delivery_type,
                    return_type: order.return_type,
                    delivery_charge: order.delivery_charge,
                    productName: product?.basicInfo?.productTitle || "Unknown Product",
                    productId: `${product?._id}`,
                    estimated_delivery_date: estimatedDeliveryDate,
                    price: `${order.total_price} ${product?.pricing?.currency || "INR"}`,
                    productImage: product?.images?.length > 0 ? product.images[0] : "",
                    buyerAddress: address
                        ? `${address.streetAddress}, ${address.apartment ? address.apartment + ', ' : ''}${address.city}, ${address.state}, ${address.postalCode}, ${address.country}${address.phoneNumber ? ' ✆ ' + address.phoneNumber : ''}`
                        : "Address Not Found",
                    requestDate: order.timestamp,
                    status: order.order_status, // Updated to return the correct buyer_approval_status
                    isIncrement,
                    incrementAmount: isIncrement ? priceDifference : "0",
                    decrementAmount: !isIncrement ? priceDifference : "0",
                    incrementPercentage: isIncrement ? percentageDifference : "0",
                    decrementPercentage: !isIncrement ? percentageDifference : "0",
                };
            })
        );

        console.log(`Final order response prepared with ${orderRequests.length} items`);

        const pagination = {
            totalResults: totalItems,
            totalPages,
            currentPage: pageNumber,
            limit: pageSize,
            hasNextPage: pageNumber < totalPages,
            hasPreviousPage: pageNumber > 1,
        };

        console.log("Pagination details:", pagination);

        return handleSuccessV1(res, 200, "Pending and approved orders retrieved successfully", { orders: orderRequests, pagination });
    } catch (error) {
        console.error("Error fetching pending and approved orders:", error);
        return handleError(res, 500, `Error fetching pending and approved orders: ${error.message}`);
    }
};

export const getPendingOrders = async (req, res) => {
    try {
        const { seller_id, page = 1, limit = 10 } = req.query;

        if (!seller_id) {
            return handleError(res, 400, "Missing required field: seller_id");
        }

        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);
        const skip = (pageNumber - 1) * pageSize;

        const totalItems = await Order.countDocuments({ seller_id, order_status: "Pending" });
        const totalPages = Math.ceil(totalItems / pageSize);

        const orders = await Order.find({ seller_id, order_status: "Pending" })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(pageSize)
            .populate("product_id")
            .populate("delivery_address_id");

        const orderRequests = await Promise.all(
            orders.map(async (order, index) => {
                const product = await Product.findById(order.product_id);
                const address = await DeliveryAddressModel.findById(order.delivery_address_id);

                let buyer = await User.findById(order.user_id);
                if (!buyer) {
                    buyer = await BusinessModel.findById(order.user_id);
                }

                console.log(buyer);

                let finalPrice = parseFloat(product?.pricing?.salePrice || product?.pricing?.regularPrice || "0");
                if (product?.pricing?.gstDetails?.gstIncluded) {
                    finalPrice += (finalPrice * product.pricing.gstDetails.gstPercentage) / 100;
                }
                if (product?.pricing?.additionalTaxes?.length > 0) {
                    product.pricing.additionalTaxes.forEach(tax => {
                        finalPrice += (finalPrice * tax.percentage) / 100;
                    });
                }
                finalPrice = finalPrice.toFixed(2);

                return {
                    id: order._id,
                    trackId: order.delivery_partner.tracking_number,
                    req_id: `REQ${1000 + skip + index}`,
                    buyerName: buyer?.businessName || buyer?.full_Name || "Unknown Buyer",
                    buyerAddress: address
                        ? `${address.streetAddress}, ${address.apartment ? address.apartment + ', ' : ''}${address.city}, ${address.state}, ${address.postalCode}, ${address.country}${address.phoneNumber ? ' ✆ ' + address.phoneNumber : ''}`
                        : "Address Not Found",
                    productName: product?.basicInfo?.productTitle || "Unknown Product",
                    productId: `PROD${product?._id}`,
                    price: `${finalPrice} ${product?.pricing?.currency || "INR"}`,
                    productImage: product?.images?.length > 0 ? product.images[0] : "https://picsum.photos/200",
                    requestDate: order.timestamp,
                    status: order.order_status.toLowerCase(),
                };
            })
        );

        const pagination = {
            totalResults: totalItems,
            totalPages,
            currentPage: pageNumber,
            limit: pageSize,
            hasNextPage: pageNumber < totalPages,
            hasPreviousPage: pageNumber > 1,
        };

        return handleSuccessV1(res, 200, "Pending orders retrieved successfully", { orders: orderRequests, pagination });
    } catch (error) {
        return handleError(res, 500, `Error fetching pending orders: ${error.message}`);
    }
};


export const confirmOrderBySeller = async (req, res) => {
    try {
        const {
            orderId,
            deliveryCharge = 0,
            deliveryTimeInDays = 5,
            returnType = "No Return",
            deliveryType = "Standard",
            specialInstructions = "",
            trackingInfo,
            needsSignature = false,
            isFragile = false,
            paymentMethod
        } = req.body;

        if (!orderId) {
            return handleError(res, 400, "Missing required field: orderId");
        }

        const order = await Order.findById(orderId);
        console.log(order, "order");
        if (!order) {
            return handleError(res, 404, "Order not found");
        }

        const product = await Product.findById(order.product_id);
        if (!product) {
            return handleError(res, 404, "Product not found");
        }

        let user = await registerModel.findById(order.user_id);
        if (!user) {
            user = await BusinessModel.findById(order.user_id);
        }

        let totalAmount = parseFloat(order.total_price) + parseFloat(deliveryCharge);
        totalAmount = totalAmount.toFixed(2);

        const estimatedDeliveryDate = new Date();
        estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + parseInt(deliveryTimeInDays));

        // Convert to Indian Standard Time (IST - UTC+5:30)
        const estimatedDeliveryDateIST = new Date(estimatedDeliveryDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));


        order.order_status = "Accepted";
        order.seller_review_status = "Accepted";
        order.total_price = totalAmount;
        order.deliveryTimeInDays = deliveryTimeInDays;
        order.estimated_delivery_date = estimatedDeliveryDateIST;
        order.delivery_method = deliveryType;
        order.payment_mode = paymentMethod;
        order.delivery_charge = parseFloat(deliveryCharge);
        order.return_type = returnType;
        order.special_instructions = specialInstructions;
        order.needs_signature = needsSignature;
        order.is_fragile = isFragile;

        // Ensure delivery_partner exists
        if (!order.delivery_partner) {
            order.delivery_partner = {};
        }
        order.delivery_partner.tracking_number = trackingInfo || generateTrackingNumber();

        order.tracking_info.push({ status: "Order Accepted By Seller", timestamp: new Date() });

        await order.save();

        const validPlayerIds = (user?.subscriptionIDs || []).filter(id => isValidUUID(id));

        // Move this check **after** validPlayerIds is initialized
        if (validPlayerIds.length === 0) {
            return handleError(res, 400, "Invalid or missing player_id(s) for push notifications");
        }

        console.log(validPlayerIds);

        const notificationPayload = {
            userId: order.seller_id,
            playerIds: validPlayerIds,
            title: "Order Accepted by Seller ✅",
            message: `Your order for ${product.basicInfo.productTitle.trim()} has been accepted! Processing will begin soon. Stay tuned for updates.`,
            productImageUrl: product.images?.length > 0 ? product.images[0] : null,
        };


        sendPushNotification(notificationPayload);
        storeNotificationMessage(notificationPayload);
        return handleSuccessV1(res, 200, "Order Accepted successfully", {
            orderId: order._id,
            totalAmount,
            estimatedDeliveryDate,
            trackingNumber: order.delivery_partner.tracking_number,
            status: order.order_status
        });
    } catch (error) {
        return handleError(res, 500, `Error confirming order: ${error.message}`);
    }
};

export const cancelOrderBySeller = async (req, res) => {
    try {
        const { orderId, cancelReason, additionalComments, category } = req.body;

        if (!orderId) {
            return handleError(res, 400, "Missing required field: orderId");
        }
        if (!cancelReason) {
            return handleError(res, 400, "Missing required field: cancelReason");
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return handleError(res, 404, "Order not found");
        }
        const product = await Product.findById(order.product_id);
        console.log(product, "product")
        if (!product) {
            return handleError(res, 404, "Product not found");
        }
        if (order.order_status === "Cancelled") {
            return handleError(res, 400, "Order is already cancelled");
        }

        order.order_status = "Cancelled";
        order.seller_review_status = "Rejected";
        order.buyer_approval_status = "Rejected By Seller";
        order.cancel_reason = cancelReason;
        order.cancel_category = category;
        order.additionalCommentsForCancel = additionalComments;
        order.tracking_info.push({ status: "Order Cancelled By Seller", reason: cancelReason, timestamp: new Date() });

        await order.save();

        const user = await registerModel.findById(order.user_id);
        console.log(user, "user");

        const validPlayerIds = (user?.subscriptionIDs || []).filter(id => isValidUUID(id));

        if (validPlayerIds.length === 0) {
            return handleError(res, 400, "Invalid or missing player_id(s) for push notifications");
        }

        console.log(validPlayerIds);

        const notificationPayload = {
            userId: order.seller_id,
            playerIds: validPlayerIds,
            title: "Order Canceled ",
            message: `The seller has canceled your order for ${product.basicInfo.productTitle.trim()}.`,
            productImageUrl: product.images?.length > 0 ? product.images[0] : null,
        };


        sendPushNotification(notificationPayload);
        storeNotificationMessage(notificationPayload);
        return handleSuccessV1(res, 200, "Order cancelled successfully", {
            orderId: order._id,
            status: order.order_status,
            cancelReason: order.cancel_reason
        });
    } catch (error) {
        return handleError(res, 500, `Error cancelling order: ${error.message}`);
    }
};


export const createOrder = async (req, res) => {
    try {
        const { product_id, delivery_address_id, user_id, isBusinessAccount } = req.body;

        if (!product_id || !delivery_address_id || !user_id) {
            return handleError(res, 400, "Missing required fields");
        }

        const product = await Product.findById(product_id);
        if (!product) {
            return handleError(res, 404, "Product not found");
        }

        const user = isBusinessAccount
            ? await BusinessModel.findById(user_id)
            : await User.findById(user_id);

        const business = await BusinessModel.findById(product.createdBy);

        if (!user) {
            return handleError(res, 404, isBusinessAccount ? "Business account not found" : "User not found");
        }

        const seller_id = product.createdBy;
        const trackingNumber = generateTrackingNumber();

        let totalPrice = parseFloat(product?.pricing?.salePrice || product?.pricing?.regularPrice || "0");

        if (product?.pricing?.gstDetails?.gstIncluded) {
            totalPrice += (totalPrice * product.pricing.gstDetails.gstPercentage) / 100;
        }

        if (product?.pricing?.additionalTaxes?.length > 0) {
            product.pricing.additionalTaxes.forEach(tax => {
                totalPrice += (totalPrice * tax.percentage) / 100;
            });
        }

        totalPrice = totalPrice.toFixed(2);

        const newOrder = new Order({
            user_id,
            seller_id,
            product_id,
            delivery_address_id,
            delivery_partner: { tracking_number: trackingNumber },
            order_date: new Date(),
            order_status: "Pending",
            total_price: totalPrice,
            tracking_info: [
                {
                    status: `Order created by ${isBusinessAccount ? user.businessName : user.full_Name || "Customer"}`,
                    timestamp: moment().tz("Asia/Kolkata").toDate(),
                }
            ]
        });

        const savedOrder = await newOrder.save();

        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

        const validPlayerIds = (business?.subscriptionIDs || []).filter(id => isValidUUID(id));

        if (validPlayerIds.length === 0) {
            return handleError(res, 400, "Invalid or missing player_id(s) for push notifications");
        }

        console.log(validPlayerIds);

        const notificationPayload = {
            playerIds: validPlayerIds,
            title: "New Order Received! 🎉",
            message: `${product.basicInfo.productTitle.trim()} just ordered! Please confirm to start processing.`,
            productImageUrl: product.images?.length > 0 ? product.images[0] : null,
            appLogoUrl: isBusinessAccount ? user.brand_logo : user.profile_url,
            additionalData: {
                order_id: savedOrder._id.toString(),
                tracking_number: trackingNumber,
                product_name: product.caption,
                customer_name: isBusinessAccount ? user.businessName : user.full_Name || "Customer",
                order_value: `${totalPrice} ${product.currency || "INR"}`,
                order_date: new Date().toISOString(),
                needs_confirmation: true
            }
        };

        sendPushNotification(notificationPayload);

        return handleSuccessV1(res, 201, "Order placed successfully", {
            order: savedOrder,
            tracking: {
                number: trackingNumber,
                estimated_delivery: estimatedDelivery
            }
        });
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

export const shippedOrderBySeller = async (req, res) => {
    try {
        const { orderId } = req.body;
        console.log("Received request to ship order:", orderId);

        if (!orderId) {
            console.log("Missing orderId in request body");
            return handleError(res, 400, "Missing required field: orderId");
        }

        const order = await Order.findById(orderId);
        if (!order) {
            console.log("Order not found for orderId:", orderId);
            return handleError(res, 404, "Order not found");
        }
        console.log("Order found:", order);

        const product = await Product.findById(order.product_id);
        if (!product) {
            console.log("Product not found for product_id:", order.product_id);
            return handleError(res, 404, "Product not found");
        }
        console.log("Product found:", product.basicInfo.productTitle);

        if (order.order_status !== "Confirmed") {
            console.log(`Order status is '${order.order_status}'. Only 'Confirmed' orders can be shipped.`);
            return handleError(res, 400, "Only confirmed orders can be marked as Shipped");
        }

        if (order.order_status === "Shipped") {
            console.log("Order is already marked as Shipped:", orderId);
            return handleError(res, 400, "Order is already marked as Shipped");
        }

        if (product.availability.stockQuantity <= 0) {
            console.log("Insufficient stock to ship the order. Current stock:", product.availability.stockQuantity);
            return handleError(res, 400, "Insufficient stock to ship this order");
        }

        console.log("Updating order status to Shipped...");
        order.order_status = "Shipped";
        order.seller_review_status = "Shipped";
        order.is_Shipped = "true";
        order.tracking_info.push({
            status: "Order Shipped By Seller",
            timestamp: new Date(),
        });

        product.availability.stockQuantity -= 1;
        product.availability.inStock = product.availability.stockQuantity > 0;
        console.log("Updated product stock. Remaining:", product.availability.stockQuantity);

        await Promise.all([order.save(), product.save()]);
        console.log("Order and product saved successfully");

        let user = await registerModel.findById(order.user_id);
        if (!user) {
            user = await BusinessModel.findById(order.user_id);
        }

        if (!user) {
            console.log("User not found for user_id:", order.user_id);
        } else {
            const validPlayerIds = (user.subscriptionIDs || []).filter(id => isValidUUID(id));
            console.log("Valid player IDs for push notification:", validPlayerIds);

            if (validPlayerIds.length > 0) {
                sendPushNotification({
                    playerIds: validPlayerIds,
                    title: "Order Shipped",
                    message: `The seller has shipped your order for ${product.basicInfo.productTitle.trim()}.`,
                    productImageUrl: product.images?.length > 0 ? product.images[0] : null,
                });
                console.log("Push notification sent successfully");
            } else {
                console.log("No valid player IDs found for push notification");
            }
        }

        return handleSuccessV1(res, 200, "Order shipped successfully", {
            orderId: order._id,
            status: order.order_status,
        });
    } catch (error) {
        console.error("Error shipping order:", error);
        return handleError(res, 500, `Error shipping order: ${error.message}`);
    }
};


export const changePaymentBySeller = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return handleError(res, 400, "Missing required field: orderId");
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return handleError(res, 404, "Order not found");
        }

        if (!order.seller_id) {
            return handleError(res, 400, "Seller ID is missing in order data");
        }

        const product = await Product.findById(order.product_id);
        if (!product) {
            return handleError(res, 404, "Product not found");
        }

        // Update order payment status
        order.payment_status = "Completed";
        order.order_status = "Payed Off";
        order.is_Payment = true;
        order.tracking_info.push({
            status: "Payment Completed",
            timestamp: new Date(),
        });

        await order.save();

        // Fetch user details
        let user = await registerModel.findById(order.user_id);
        if (!user) {
            user = await BusinessModel.findById(order.user_id);
        }

        // Send push notification if valid player IDs exist
        const validPlayerIds = (user?.subscriptionIDs || []).filter(id => isValidUUID(id));
        if (validPlayerIds.length > 0) {
            sendPushNotification({
                playerIds: validPlayerIds,
                title: "Payment Completed",
                message: `The payment for your order (${product.basicInfo.productTitle.trim()}) has been successfully processed.`,
                productImageUrl: product.images?.length > 0 ? product.images[0] : null,
            });
        }

        return handleSuccessV1(res, 200, "Payment status updated successfully", {
            orderId: order._id,
            is_Payment: order.is_Payment,
        });
    } catch (error) {
        return handleError(res, 500, `Error updating payment status: ${error.message}`);
    }
};



export const getConfirmedOrders = async (req, res) => {
    try {
        console.log("Received request for confirmed orders:", req.query);

        const { id, isBusiness = false, page = 1, limit = 10 } = req.query;

        if (!id) {
            console.error("Missing required field: id");
            return handleError(res, 400, "Missing required field: id");
        }

        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);
        const skip = (pageNumber - 1) * pageSize;

        console.log(`Fetching confirmed orders for ID: ${id}, Page: ${pageNumber}, Limit: ${pageSize}, Skip: ${skip}`);

        const queryFilter = {
            order_status: isBusiness === "true" ? { $nin: ["Pending", "Cancelled", "Rejected"] } : { $in: ["Confirmed", "Shipped", "Delivered"] },
            [isBusiness === "true" ? "seller_id" : "user_id"]: id,
        };

        const totalItems = await Order.countDocuments(queryFilter);
        console.log(`Total confirmed orders found: ${totalItems}`);

        const totalPages = Math.ceil(totalItems / pageSize);

        const orders = await Order.find(queryFilter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(pageSize)
            .populate("product_id")
            .populate("delivery_address_id");

        // ✅ Custom sort: "Confirmed" first, then "Accepted"
        orders.sort((a, b) => (a.order_status === "Confirmed" ? -1 : 1));

        console.log(`Confirmed orders fetched: ${orders.length}`);

        const orderRequests = await Promise.all(
            orders.map(async (order) => {
                const product = await Product.findById(order.product_id);
                const address = await DeliveryAddressModel.findById(order.delivery_address_id);

                return {
                    id: order._id,
                    trackId: order.delivery_partner?.tracking_number || "N/A",
                    delivery_type: order.delivery_type,
                    return_type: order.return_type,
                    delivery_charge: order.delivery_charge,
                    productName: product?.basicInfo?.productTitle || "Unknown Product",
                    productId: `${product?._id}`,
                    is_Shipped: order.is_Shipped,
                    is_Delivered: order.is_Delivered,
                    is_Payment: order.is_Payment,
                    estimated_delivery_date: order.estimated_delivery_date,
                    price: `${product?.pricing?.currency === "INR" ? "₹" : product?.pricing?.currency || ""} ${order.total_price}`,
                    productImage: product?.images?.length > 0 ? product.images[0] : "",
                    buyerAddress: address
                        ? `${address.streetAddress}, ${address.apartment ? address.apartment + ', ' : ''}${address.city}, ${address.state}, ${address.postalCode}, ${address.country}${address.phoneNumber ? ' ✆ ' + address.phoneNumber : ''}`
                        : "Address Not Found",
                    requestDate: order.timestamp,
                    status: order.order_status,
                };
            })
        );

        console.log(`Final confirmed order response prepared with ${orderRequests.length} items`);

        const pagination = {
            totalResults: totalItems,
            totalPages,
            currentPage: pageNumber,
            limit: pageSize,
            hasNextPage: pageNumber < totalPages,
            hasPreviousPage: pageNumber > 1,
        };

        console.log("Pagination details:", pagination);

        return handleSuccessV1(res, 200, "Confirmed orders retrieved successfully", { orders: orderRequests, pagination });
    } catch (error) {
        console.error("Error fetching confirmed orders:", error);
        return handleError(res, 500, `Error fetching confirmed orders: ${error.message}`);
    }
};


export const DeliveredBySeller = async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return handleError(res, 400, "Missing required field: orderId");
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return handleError(res, 404, "Order not found");
        }

        if (!order.seller_id) {
            return handleError(res, 400, "Seller ID is missing in order data");
        }

        const seller = await businessregisterModel.findById(order.seller_id);
        if (!seller) {
            return handleError(res, 404, "Seller not found");
        }

        if (order.order_status === "Delivered") {
            return handleError(res, 400, "Order is already marked as Delivered");
        }

        const product = await Product.findById(order.product_id);
        if (!product) {
            return handleError(res, 404, "Product not found");
        }

        // Update order status
        order.order_status = "Delivered";
        order.seller_review_status = "Delivered";
        order.is_Delivered = true;

        order.tracking_info.push({
            status: `Order Delivered by Seller (${seller.businessName || "Unknown Seller"})`,
            timestamp: new Date(),
        });

        await order.save();

        // Send push notification to user
        const user = await registerModel.findById(order.user_id);
        if (user) {
            const validPlayerIds = (user.subscriptionIDs || []).filter(id => isValidUUID(id));
            if (validPlayerIds.length > 0) {
                sendPushNotification({
                    playerIds: validPlayerIds,
                    title: "Order Delivered",
                    message: `Your order for ${product.basicInfo.productTitle.trim()} has been marked as Delivered by ${seller.businessName || "Unknown Seller"}.`,
                    productImageUrl: product.images?.length > 0 ? product.images[0] : null,
                });
            }
        }

        return handleSuccessV1(res, 200, "Order delivered successfully", {
            orderId: order._id,
            status: order.order_status,
            updatedBy: "Seller",
            updatedByName: seller.Name || "Unknown Seller",
        });

    } catch (error) {
        return handleError(res, 500, `Error updating order status: ${error.message}`);
    }
};


