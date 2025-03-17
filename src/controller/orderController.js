0x9b16e7f5ce8ff7912863d2482bcc53e905c20b56c1d8d214d765802674d30205

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
import { handleSuccess, handleSuccessV1, handleError , generateTrackingNumber } from "../utils/responseHandler.js";
import { sendPushNotification } from "../service/pushNotificationService.js";

import { v4 as uuidv4, validate as isValidUUID } from "uuid";


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

        // if (order.order_status !== "Pending") {
        //     return handleError(res, 400, `Order status has already changed to ${order.order_status}. Confirmation is not allowed.`);
        // }

        order.order_status = "Confirmed";
        order.buyer_approval_status = "Accepted";

        order.tracking_info.push({ status: "Confirmed", timestamp: moment().tz("Asia/Kolkata").toDate() });

        await order.save();

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

        // if (order.order_status !== "Pending") {
        //     return handleError(res, 400, `Order status has already changed to ${order.order_status}. Rejection is not allowed.`);
        // }

        order.order_status = "Rejected";
        order.buyer_approval_status = "Rejected";
        order.reject_reason_by_buyer = rejectReason;

        order.tracking_info.push({ status: "Rejected", timestamp: moment().tz("Asia/Kolkata").toDate(), reason: rejectReason });

        await order.save();

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
        const queryFilter = { user_id, order_status: { $in: ["Accepted", "Pending"] } , seller_review_status: { $in: ["Accepted", "Pending"] } };

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
                    buyerName: buyer?.org_name || buyer?.full_Name || "Unknown Buyer",
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
        if (!order) {
            return handleError(res, 404, "Order not found");
        }

        const product = await Product.findById(order.product_id);
        if (!product) {
            return handleError(res, 404, "Product not found");
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
        order.deliveryTimeInDays= deliveryTimeInDays;
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

        order.tracking_info.push({ status: "Order Accepted", timestamp: new Date() });

        await order.save();



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
        const { orderId, cancelReason ,additionalComments,category} = req.body;

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

        if (order.order_status === "Cancelled") {
            return handleError(res, 400, "Order is already cancelled");
        }

        order.order_status = "Cancelled";
        order.seller_review_status = "Rejected";
        order.buyer_approval_status = "Rejected By Seller";
        order.cancel_reason = cancelReason;
        order.cancel_category = category;
        order.additionalCommentsForCancel = additionalComments;
        order.tracking_info.push({ status: "Order Cancelled", reason: cancelReason, timestamp: new Date() });

        await order.save();

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
            total_price: totalPrice
        }); 
 
        const savedOrder = await newOrder.save();
        
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

        // ✅ Validate `subscriptionIDs`
        const validPlayerIds = (business?.subscriptionIDs || []).filter(id => isValidUUID(id));

        // Move this check **after** validPlayerIds is initialized
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

        await sendPushNotification(notificationPayload);

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

