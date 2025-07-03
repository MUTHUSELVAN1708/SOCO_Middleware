import ServiceModel from "../model/serviceModel.js";
import BusinessAccount from "../model/BusinessModel.js";
import { handleSuccessV1, handleError } from "../utils/responseHandler.js";
import Order from "../model/orderModel.js";
import Product from "../model/Product.js";
import DeliveryAddressModel from "../model/deliveryAddressModel.js";
import mongoose from "mongoose";

export const getAllServices = async (req, res) => {
    try {
        let {
            category = "all",
            searchQuery = "",
            page = 1,
            limit = 10,
        } = req.query;

        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;

        // Sanitize inputs
        category = category.replace(/['"]+/g, "").toLowerCase().trim();
        searchQuery = searchQuery.trim();

        const filters = {};

        if (category !== "all") {
            filters.category = { $regex: `^${category}$`, $options: "i" };
        }

        if (searchQuery !== "") {
            filters.$or = [
                { name: { $regex: searchQuery, $options: "i" } },
                { description: { $regex: searchQuery, $options: "i" } },
            ];
        }

        const [services, totalCount] = await Promise.all([
            ServiceModel.find(filters)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize),
            ServiceModel.countDocuments(filters),
        ]);

        if (!services || services.length === 0) {
            return handleError(res, 404, "No services found");
        }

        const totalPages = Math.ceil(totalCount / pageSize);

        handleSuccessV1(res, 200, "Services fetched successfully", {
            page: pageNumber,
            limit: pageSize,
            totalCount,
            totalPages,
            services,
        });
    } catch (error) {
        console.error("Error fetching services:", error);
        handleError(res, 500, "Failed to fetch services", error.message);
    }
}


export const getAllProviders = async (req, res) => {
    try {
        let {
            natureOfBusiness = "",
            searchQuery = "",
            page = 1,
            limit = 10,
        } = req.body;

        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;

        // Sanitize input
        natureOfBusiness = natureOfBusiness.trim().toLowerCase();
        searchQuery = searchQuery.trim();

        const filters = {};

        if (natureOfBusiness !== "") {
            filters.natureOfBusiness = { $regex: `^${natureOfBusiness}$`, $options: "i" };
        }

        if (searchQuery !== "") {
            filters.$or = [
                { Brand_Name: { $regex: searchQuery, $options: "i" } },
                { Name: { $regex: searchQuery, $options: "i" } },
                { org_name: { $regex: searchQuery, $options: "i" } },
                { businessName: { $regex: searchQuery, $options: "i" } },
                { category: { $regex: searchQuery, $options: "i" } },
                { sub_category: { $regex: searchQuery, $options: "i" } },
            ];
        }

        const [providers, totalCount] = await Promise.all([
            BusinessAccount.find(filters)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(pageSize),
            BusinessAccount.countDocuments(filters),
        ]);

        if (!providers || providers.length === 0) {
            return handleError(res, 404, "No providers found");
        }

        const totalPages = Math.ceil(totalCount / pageSize);

        const result = providers.map((provider) => ({
            id: provider._id,
            name: provider.businessName || provider.org_name || provider.businessName || '',
            imageUrl: provider.brand_logo || '',
            type: provider.type || 'Business',
            lat: provider.lat || 0.0,
            lng: provider.lng || 0.0,
            address: provider.businessAddress || '',
            natureOfBusiness: provider.natureOfBusiness || '',
        }));

        handleSuccessV1(res, 200, "Providers fetched successfully", {
            page: pageNumber,
            limit: pageSize,
            totalCount,
            totalPages,
            providers: result,
        });

    } catch (error) {
        console.error("Error fetching providers:", error);
        handleError(res, 500, "Failed to fetch providers", error.message);
    }
};

export const getPopularServices = async (req, res) => {
    try {
        const [popularServices, stats] = await Promise.all([
            ServiceModel.find()
                .sort({ userCount: -1 })
                .limit(6),
            ServiceModel.aggregate([
                {
                    $group: {
                        _id: null,
                        totalServices: { $sum: 1 },
                        totalProviders: { $sum: "$userCount" },
                        averageRating: { $avg: "$rating" }
                    }
                }
            ])
        ]);

        if (!popularServices || popularServices.length === 0) {
            return handleError(res, 404, "No popular services found");
        }

        const { totalServices, totalProviders, averageRating } = stats[0] || {
            totalServices: 0,
            totalProviders: 0,
            averageRating: 0,
        };

        handleSuccessV1(res, 200, "Popular services fetched successfully", {
            popularServices,
            totalServices,
            totalProviders,
            totalRating: Number(averageRating.toFixed(2)),
        });
    } catch (error) {
        console.error("Error fetching popular services:", error);
        handleError(res, 500, "Failed to fetch popular services", error.message);
    }
};


// New method: Get unique categories sorted by sum of userCount with pagination
export const getCategories = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const categoriesAgg = await ServiceModel.aggregate([
            {
                $group: {
                    _id: "$category",
                    totalUserCount: { $sum: "$userCount" },
                }
            },
            {
                $sort: { totalUserCount: -1 }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ]);

        const totalCategories = await ServiceModel.distinct("category").then(cats => cats.length);

        if (!categoriesAgg || categoriesAgg.length === 0) {
            return handleError(res, 404, "No categories found");
        }

        const totalPages = Math.ceil(totalCategories / limit);

        // Convert aggregation result
        const categories = categoriesAgg.map(cat => ({
            category: cat._id,
            totalUserCount: cat.totalUserCount,
        }));

        // Add 'All' as default first entry
        categories.unshift({
            category: "All",
            totalUserCount: categories.reduce((sum, cat) => sum + cat.totalUserCount, 0),
        });

        handleSuccessV1(res, 200, "Categories fetched successfully", {
            page,
            limit,
            totalCategories,
            totalPages,
            categories,
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        handleError(res, 500, "Failed to fetch categories", error.message);
    }
};


export const getRejectedOrders = async (req, res) => {
    try {
        const { id, page = 1, limit = 10, isBusiness = false } = req.query;
        console.log(req.query)

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return handleError(res, 400, "Invalid or missing 'id'");
        }

        const isBusinessUser = isBusiness === "true" || isBusiness === true;

        const pageNumber = parseInt(page, 10);
        const pageSize = parseInt(limit, 10);
        const skip = (pageNumber - 1) * pageSize;

let queryFilter = {};

if (isBusinessUser) {
  // Seller view: show seller's rejected orders or user-cancelled orders involving the seller
  queryFilter = {
    $or: [
      {
        order_status: "Rejected",
        seller_id: new mongoose.Types.ObjectId(id),
      },
      {
        order_status: "Cancelled",
        seller_id: new mongoose.Types.ObjectId(id),
      },
    ],
  };
} else {
  // User view: show user's cancelled or rejected orders
  queryFilter = {
    $or: [
      {
        order_status: "Cancelled",
        user_id: new mongoose.Types.ObjectId(id),
      },
      {
        order_status: "Rejected",
        user_id: new mongoose.Types.ObjectId(id),
      },
    ],
  };
}



        console.log("Query Filter:", queryFilter);

        const totalItems = await Order.countDocuments(queryFilter);
        const totalPages = Math.ceil(totalItems / pageSize);

        const orders = await Order.find(queryFilter)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(pageSize)
            .populate("product_id")
            .populate("delivery_address_id");
        console.log(orders)
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
                    productImage: product?.images?.[0] || "",
                    buyerAddress: address
                        ? `${address.streetAddress}, ${address.apartment ? address.apartment + ', ' : ''}${address.city}, ${address.state}, ${address.postalCode}, ${address.country}${address.phoneNumber ? ' ✆ ' + address.phoneNumber : ''}`
                        : "Address Not Found",
                    requestDate: order.timestamp,
                    status: order.order_status,
                    cancel_reason: order.cancel_reason || order.reject_reason_by_buyer ||order.cancel_reason_by_buyer,
                    cancel_category: order.cancel_category ,
                    additionalCommentsForCancel: order.additionalCommentsForCancel,
                    tracking_info: order.tracking_info,
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

        return handleSuccessV1(res, 200, "Rejected orders retrieved successfully", {
            orders: orderRequests,
            pagination,
        });
    } catch (error) {
        console.error("Error fetching rejected orders:", error);
        return handleError(res, 500, `Error fetching rejected orders: ${error.message}`);
    }
};

