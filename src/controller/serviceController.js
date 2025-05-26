import ServiceModel from "../model/serviceModel.js";
import BusinessAccount from "../model/BusinessModel.js"; 
import { handleSuccessV1, handleError } from "../utils/responseHandler.js";

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

