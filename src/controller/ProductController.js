import Product from '../model/Product.js';
import { validateProduct } from '../utils/validators.js';
import adminService from '../service/adminService.js';
import mongoose from 'mongoose';
import Order from "../model/orderModel.js"
import businessregisterModel from '../model/BusinessModel.js';
import viewsModel from '../model/VisitModel.js';
import registerModel from '../model/registerModel.js';
import createPostModel from '../model/createPostModel.js';
import ReviewModel from '../model/reviewModel.js';
import Follow from '../model/FollowModel.js';

const ERROR_MESSAGES = {
  VALIDATION: {
    MISSING_TITLE: 'Product title is required',
    MISSING_PRICE: 'Product price is required',
    INVALID_PRICE: 'Product price must be a positive number',
    INVALID_STOCK: 'Stock quantity must be a non-negative number',
    INVALID_DISCOUNT: 'Discount must be between 0 and 100',
    DUPLICATE_SKU: 'Product with this SKU already exists',
    INVALID_IMAGES: 'At least one product image is required',
    INVALID_CATEGORY: 'At least one category is required',
  },
  AUTH: {
    ACCESS_DENIED: 'You do not have permission to modify this product',
    INVALID_USER: 'User authentication failed',
  },
  PRODUCT: {
    NOT_FOUND: 'Product not found',
    CREATE_SUCCESS: 'Product created successfully',
    UPDATE_SUCCESS: 'Product updated successfully',
    DELETE_SUCCESS: 'Product deleted successfully',
  },
  SYSTEM: {
    DATABASE_ERROR: 'Database operation failed',
    INVALID_REQUEST: 'Invalid request parameters',
    SERVER_ERROR: 'An unexpected error occurred'
  }
};

const formatResponse = (success, message, data = null, errors = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };

  if (data) response.data = data;
  if (errors) response.errors = errors;

  return response;
};


export const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const product = await Product.findOne({
      _id: productId,
      status: { $ne: "Deactivate" }
    }).populate('createdBy').exec();

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.status(200).json({ success: true, message: 'Product fetched successfully', data: product });
  } catch (error) {
    console.error('Error fetching product:', error);
    return res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};




export const getProductDetail = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json(
        formatResponse(false, ERROR_MESSAGES.PRODUCT.NOT_FOUND)
      );
    }

    const product = await Product.findOne({
      _id: productId,
      status: { $ne: "Deactivate" }
    })
      .populate('createdBy') // populates business details
      .exec();

    console.log(product, "kkkk");

    if (!product) {
      return res.status(404).json(
        formatResponse(false, ERROR_MESSAGES.PRODUCT.NOT_FOUND)
      );
    }

    const review = await ReviewModel.find({ productId: productId }).sort({ rating: -1 }).limit(3);
    console.log(review, "review")
    const business = product.createdBy;

    const transformedReviews = product.ratings.reviews.map(review => ({
      id: review.id,
      userName: review.userName,
      userAvatar: review.userAvatar || null,
      rating: review.rating,
      review: review.review,
      datePosted: review.datePosted,
      isVerifiedPurchase: review.isVerifiedPurchase,
      reviewImages: review.reviewImages || [],
      helpfulCount: review.helpfulCount,
      isEdited: review.isEdited,
      replies: review.replies.map(reply => ({
        id: reply.id,
        userName: reply.userName,
        userAvatar: reply.userAvatar || null,
        reply: reply.reply,
        datePosted: reply.datePosted,
        isSellerResponse: reply.isSellerResponse,
        isEdited: reply.isEdited
      }))
    }));

    const ratingDistribution = {};
    product.ratings.ratingDistribution.forEach((value, key) => {
      ratingDistribution[key] = value;
    });

    const gstIncluded = product.pricing.gstDetails.gstIncluded;
    const gstPercentage = product.pricing.gstDetails.gstPercentage || 0;

    const additionalTaxes = product.pricing.additionalTaxes || [];

    const totalAdditionalTax = additionalTaxes.reduce((sum, tax) => {
      return sum + (tax.percentage || 0);
    }, 0);

    const totalTaxPercentage = gstPercentage + totalAdditionalTax;

    const pricing = {
      regularPrice: product.pricing.regularPrice?.toString() || null,
      salePrice: product.pricing.salePrice?.toString() || null,
      discount: product.pricing.discount,
      currency: product.pricing.currency === 'INR' ? '₹' : product.pricing.currency,
      gstIncluded,
      gstPercentage,
      additionalTaxes,
      totalTaxPercentage,
    };


    const productDetailResponse = {
      productTitle: product.basicInfo.productTitle,
      businessName: business?.businessName || null,
      businessAddress: business?.businessAddress || null,
      BusinessLogo: business?.brand_logo || null,
      createdBy: product.createdBy._id || null,
      brand: product.basicInfo.brand,
      categories: product.basicInfo.categories,
      tags: product.basicInfo.tags || [],
      images: product.images,
      unit: product.unit,
      description: product.descriptionHighlights.description,
      highlights: product.descriptionHighlights.highlights,
      pricing: pricing,
      availability: {
        inStock: product.availability.inStock,
        stockQuantity: product.availability.stockQuantity,
        deliveryTime: product.availability.deliveryTime,
        availabilityRegions: product.availability.availabilityRegions,
        codAvailable: product.availability.codAvailable,
        returnPolicy: {
          returnApplicable: product.availability.returnPolicy.returnApplicable,
          returnWindow: product.availability.returnPolicy.returnWindow,
          returnFees: product.availability.returnPolicy.returnFees,
        },
      },
      variants: product.variants.map(variant => ({
        id: variant.id,
        color: variant.color,
        colorCode: variant.colorCode,
        variant: variant.variant,
        quantity: variant.quantity,
        sku: variant.sku,
        variantImages: variant.variantImages || [],
      })),
      specifications: product.specifications.map(spec => ({
        key: spec.key,
        value: spec.value,
      })),
      ratings: {
        averageRating: product.ratings.averageRating,
        totalReviews: product.ratings.totalReviews,
        ratingDistribution,
        reviews: transformedReviews,
      },
      crossSellProducts: product.crossSellProducts.map(crossSell => ({
        productId: crossSell.productId,
        productTitle: crossSell.productTitle,
        price: crossSell.price,
        imageUrl: crossSell.imageUrl,
        currency: crossSell.currency === 'INR' ? '₹' : crossSell.currency,
      })),
      review: review
    };

    return res.status(200).json(
      formatResponse(true, 'Product details fetched successfully', productDetailResponse)
    );
  } catch (error) {
    console.error('Error fetching product details:', error);

    return res.status(500).json(
      formatResponse(false, ERROR_MESSAGES.SYSTEM.SERVER_ERROR, null, [{
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message,
      }])
    );
  }
};


export const createAndUpdateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const productData = req.body;
    const userId = req.body['userId'];

    const validationResult = validateProduct(productData);
    if (!validationResult.isValid) {
      return res.status(400).json(
        formatResponse(false, ERROR_MESSAGES.VALIDATION.INVALID_REQUEST, null, validationResult.errors)
      );
    }

    const defaultRatings = {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: {
        "5": 0,
        "4": 0,
        "3": 0,
        "2": 0,
        "1": 0
      },
      reviews: []
    };

    let product;
    let responseMessage;

    if (productId) {
      product = await Product.findOne({ _id: productId });
      if (!product) return res.status(404).json(formatResponse(false, 'Product not found'));

      product = await Product.findOneAndUpdate(
        { _id: productId },
        { $set: productData },
        { new: true, runValidators: true }
      );
      responseMessage = 'Product updated successfully';
    } else {
      product = await Product.create({
        ...productData,
        ratings: defaultRatings,
        createdBy: userId,
      });
      responseMessage = 'Product created successfully';

      const postData = {
        user_id: userId ?? '',
        typeOfAccount: "business",
        creatorName: productData?.creatorName ?? '',
        creatorProfileImageUrl: productData?.creatorProfileImageUrl ?? '',
        lat: productData?.lat ?? 0,
        lng: productData?.lng ?? 0,
        pinCode: productData?.pinCode ?? '',
        city: productData?.city ?? '',
        district: productData?.district ?? '',
        state: productData?.state ?? '',
        completeAddress: productData?.completeAddress ?? '',
        postLanguage: productData?.postLanguage ?? ['English'],
        postCategories: productData?.postCategories ?? [],
        interestPeoples: productData?.interestPeoples ?? [],
        likesCount: 0,
        commentsCount: 0,
        viewsCount: 0,
        sharesCount: 0,
        isBusinessPost: false,
        isUserPost: false,
        isProductPost: true,
        productId: product._id,
        productPrice: calculateFinalPrice(productData?.pricing),
        imageUrl: productData?.images?.[0] ?? '',
        caption: productData?.basicInfo?.productTitle ?? '',
        isScheduled: false,
        scheduleDateTime: productData?.scheduleDateTime,
        tags: productData?.tags ?? [],
        description: productData?.description ?? '',
        isVideo: false,
        location: productData?.location ?? '',
        mediaFile: productData?.images?.[0] ?? '',
        thumbnailFile: productData?.images?.[0] ?? '',
        enableComments: true,
        enableFavorites: true,
        mentions: productData?.mentions ?? [],
        filters: productData?.filters ?? [],
        quality: 'HD',
        visibility: 'public',
        aspectRatio: productData?.aspectRatio ?? 1.0,
      };

      try {
        await adminService.createPost(postData);
      } catch (postError) {
        console.error("Error creating post:", postError);
      }
    }

    return res.status(200).json(formatResponse(true, responseMessage, { productId: product._id }));
  } catch (error) {
    return res.status(500).json(formatResponse(false, 'Server error', null, [{ message: error.message }]));
  }
};


function calculateFinalPrice(pricing) {
  if (!pricing) return 0.0;

  let basePrice = parseFloat(pricing.salePrice || pricing.regularPrice || '0');
  if (isNaN(basePrice) || basePrice <= 0) return 0.0;

  let finalPrice = basePrice;

  // Apply GST if included
  if (pricing.gstDetails?.gstIncluded) {
    finalPrice += (basePrice * (pricing.gstDetails.gstPercentage || 0)) / 100;
  }

  // Apply additional taxes
  if (pricing.additionalTaxes && Array.isArray(pricing.additionalTaxes)) {
    pricing.additionalTaxes.forEach(tax => {
      if (tax.percentage) {
        finalPrice += (basePrice * tax.percentage) / 100;
      }
    });
  }

  console.log(finalPrice);

  return Math.round(finalPrice * 100) / 100; // Ensure two decimal places as a number
}



export const deleteProducts = async (req, res) => {
  try {
    const { productIds } = req.body;

    // Validate if productIds array is provided
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json(
        formatResponse(false, ERROR_MESSAGES.PRODUCT.INVALID_PRODUCT_IDS, null, [{
          code: 'INVALID_PRODUCT_IDS',
          message: 'Please provide valid product IDs array'
        }])
      );
    }

    // Validate if all IDs are valid MongoDB ObjectIds
    const validIds = productIds.every(id => mongoose.Types.ObjectId.isValid(id));
    if (!validIds) {
      return res.status(400).json(
        formatResponse(false, ERROR_MESSAGES.PRODUCT.INVALID_PRODUCT_IDS, null, [{
          code: 'INVALID_PRODUCT_ID_FORMAT',
          message: 'One or more product IDs are invalid'
        }])
      );
    }

    // Delete multiple products
    const deleteResult = await Product.deleteMany({
      _id: { $in: productIds }
    });

    const response = {
      totalRequested: productIds.length,
      totalDeleted: deleteResult.deletedCount,
      success: true
    };

    return res.status(200).json(
      formatResponse(
        true,
        `Successfully deleted ${deleteResult.deletedCount} products`,
        response
      )
    );

  } catch (error) {
    console.error('Error deleting products:', error);

    return res.status(500).json(
      formatResponse(false, ERROR_MESSAGES.SYSTEM.SERVER_ERROR, null, [{
        code: error.code || 'DELETE_PRODUCTS_ERROR',
        message: error.message
      }])
    );
  }
};

export const getProductCategories = async (req, res) => {
  const { createdBy } = req.query;

  try {
    const products = await Product.find({
      createdBy,
      status: { $ne: "Deactivate" }
    }).select("basicInfo.categories images");


    const categoryMap = {};

    products.forEach(product => {
      const categories = product.basicInfo?.categories || [];
      const image = product.images?.[0] || null;

      categories.forEach(mainCategory => {
        if (!categoryMap[mainCategory]) {
          categoryMap[mainCategory] = image;
        }
      });
    });

    const formattedCategories = Object.keys(categoryMap).map(category => ({
      category,
      image: categoryMap[category]
    }));

    // Add default "All" category at the beginning
    formattedCategories.unshift({
      category: "All",
      image: "" // Or use a placeholder image like "/default/all.png"
    });

    return res.status(200).json({
      success: true,
      status: 200,
      message: "Categories fetched successfully",
      categories: formattedCategories
    });

  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: error.message
    });
  }
};
export const getProduct = async (req, res) => {
  try {
    const {
      in_stock,
      price_min,
      price_max,
      discount_min,
      discount_max,
      categories,
      brands,
      tags,
      sizes,
      materials,
      units,
      sort_by,
      createdBy,
      page = 1,
      limit = 10
    } = req.body;
    console.log(req.body, "kkjhhh")
    if (!createdBy) {
      return res.status(400).json({ message: "createdBy is required." });
    }

    const matchStage = {
      $match: {
        "createdBy": new mongoose.Types.ObjectId(createdBy),
        status: { $ne: "Deactivate" }
      }
    };

    if (in_stock === true) {
      matchStage.$match["availability.inStock"] = true;
    }

    const pipeline = [matchStage];

    // Unwind variant array to filter sizes
    if (sizes?.length) {
      pipeline.push({
        $match: {
          "variants": {
            $elemMatch: {
              size: { $in: sizes }
            }
          }
        }
      });
    }

    // Add stage to convert price and discount to numbers
    pipeline.push({
      $addFields: {
        salePriceNum: { $toDouble: "$pricing.salePrice" },
        discountNum: { $toDouble: "$pricing.discount" }
      }
    });

    // Price range
    if (price_min !== undefined || price_max !== undefined) {
      const priceFilter = {};
      if (price_min !== undefined) {
        priceFilter.$gte = price_min;
      }
      if (price_max !== undefined) {
        priceFilter.$lte = price_max;
      }
      pipeline.push({
        $match: {
          salePriceNum: priceFilter
        }
      });
    }


    // Discount range
    if (discount_min !== undefined || discount_max !== undefined) {
      const discountFilter = {};
      if (discount_min !== undefined) {
        discountFilter.$gte = discount_min;
      }
      if (discount_max !== undefined) {
        discountFilter.$lte = discount_max;
      }

      pipeline.push({
        $match: {
          discountNum: discountFilter
        }
      });
    }

    // Brands
    if (brands?.length) {
      pipeline.push({
        $match: {
          "basicInfo.brand": { $in: brands.map(b => b.trim()) }
        }
      });
    }

    // Units
    if (units?.length) {
      pipeline.push({
        $match: {
          "unit": { $in: units.map(u => u.trim()) }
        }
      });
    }

    // Tags
    if (tags?.length) {
      pipeline.push({
        $match: {
          "basicInfo.tags": { $in: tags.map(t => t.trim()) }
        }
      });
    }

    // Materials
    if (materials?.length) {
      pipeline.push({
        $match: {
          "materials": { $in: materials.map(m => m.trim()) }
        }
      });
    }

    const isAllCategories = categories?.length === 1 && categories[0].toLowerCase() === 'all';

    if (categories?.length && !isAllCategories) {
      pipeline.push({
        $addFields: {
          categoryValues: {
            $reduce: {
              input: { $objectToArray: "$basicInfo.categories" },
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this.v"] }
            }
          }
        }
      });

      pipeline.push({
        $match: {
          categoryValues: {
            $elemMatch: {
              $regex: new RegExp(`^(${categories.join('|')})$`, 'i')  // case-insensitive match
            }
          }
        }
      });
    }


    const totalPipeline = [...pipeline, { $count: "total" }];
    const totalResult = await Product.aggregate(totalPipeline);
    const totalResults = totalResult[0]?.total || 0;
    const totalPages = Math.ceil(totalResults / limit);
    const skip = (page - 1) * limit;

    // Sorting
    let sort = {};
    switch (sort_by) {
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'nameAsc':
        sort = { name: 1 };
        break;
      case 'nameDesc':
        sort = { name: -1 };
        break;
      case 'priceAsc':
        sort = { salePriceNum: 1 };
        break;
      case 'priceDesc':
        sort = { salePriceNum: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }


    pipeline.push({ $sort: sort });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: Number(limit) });

    // Project final fields
    pipeline.push({
      $project: {
        image: { $arrayElemAt: ["$images", 0] },
        stock: "$availability.inStock",
        stockQuantity: "$availability.stockQuantity",
        amount: "$salePriceNum",
        brand: "$basicInfo.brand",
        productTitle: "$basicInfo.productTitle",
        createdAt: 1,
        discount: "$discountNum",
        postCommentsCount: 1,
        "ratings.averageRating": 1
      }
    });

    const products = await Product.aggregate(pipeline);

    res.status(200).json({
      products,
      pagination: {
        totalResults,
        totalPages,
        currentPage: Number(page),
        limit: Number(limit),
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong', error });
  }
};




const getCategoriesFacet = () => [
  { $project: { categories: { $objectToArray: "$basicInfo.categories" } } },
  { $unwind: "$categories" },
  { $unwind: "$categories.v" },
  { $group: { _id: null, values: { $addToSet: "$categories.v" } } },
  { $project: { _id: 0, values: 1 } }
];

const getTagsFacet = () => [
  { $unwind: "$basicInfo.tags" },
  { $group: { _id: "$basicInfo.tags" } },
  { $project: { _id: 0, value: "$_id" } }
];

const getPriceRangeFacet = () => [
  { $project: { price: { $toDouble: "$pricing.salePrice" } } },
  {
    $group: {
      _id: null,
      min: { $min: "$price" },
      max: { $max: "$price" }
    }
  },
  { $project: { _id: 0, min: 1, max: 1 } }
];

const getDiscountRangeFacet = () => [
  { $project: { discount: { $toDouble: "$pricing.discount" } } },
  {
    $group: {
      _id: null,
      min: { $min: "$discount" },
      max: { $max: "$discount" }
    }
  },
  { $project: { _id: 0, min: 1, max: 1 } }
];

const getBrandFiltersFacet = () => [
  {
    $group: {
      _id: "$basicInfo.brand",
      colors: { $addToSet: "$variants.color" },
      prices: { $addToSet: { $toDouble: "$pricing.salePrice" } },
      discounts: { $addToSet: { $toDouble: "$pricing.discount" } }
    }
  },
  {
    $project: {
      _id: 0,
      name: "$_id",
      colors: {
        $reduce: {
          input: "$colors",
          initialValue: [],
          in: { $setUnion: ["$$value", "$$this"] }
        }
      },
      priceRange: {
        min: { $min: "$prices" },
        max: { $max: "$prices" }
      },
      discountRange: {
        min: { $min: "$discounts" },
        max: { $max: "$discounts" }
      }
    }
  }
];

const getSizeFacet = () => [
  { $unwind: "$variants" },
  { $group: { _id: "$variants.variant" } },
  { $project: { _id: 0, value: "$_id" } }
];

const getUnitFacet = () => [
  { $group: { _id: "$unit" } },
  { $project: { _id: 0, value: "$_id" } }
];

const getMaterialFacet = () => [
  { $unwind: "$materials" },
  { $group: { _id: "$materials.material" } },
  { $project: { _id: 0, value: "$_id" } }
];


const getStockFacet = () => [
  { $group: { _id: "$availability.inStock" } },
  { $project: { _id: 0, inStock: "$_id" } }
];



export const getProductFilters = async (req, res) => {
  try {
    const { createdBy } = req.query;

    if (!createdBy) {
      return res.status(400).json({ message: "createdBy is required." });
    }

    const createdByObjectId = new mongoose.Types.ObjectId(createdBy);

    const pipeline = [
      { $match: { createdBy: createdByObjectId } },
      {
        $facet: {
          categories: getCategoriesFacet(),
          tags: getTagsFacet(),
          priceRange: getPriceRangeFacet(),
          discountRange: getDiscountRangeFacet(),
          productCount: [{ $count: "total" }],
          brands: getBrandFiltersFacet(),
          sizes: getSizeFacet(),
          units: getUnitFacet(),
          materials: getMaterialFacet(),
          stockAvailability: getStockFacet()
        }
      }
    ];

    const [result] = await Product.aggregate(pipeline);

    res.status(200).json({
      filters: {
        categories: result.categories[0]?.values || [],
        tags: result.tags.map(t => t.value).filter(Boolean),
        priceRange: result.priceRange[0] || { min: 0, max: 0 },
        discountRange: result.discountRange[0] || { min: 0, max: 0 },
        productCount: result.productCount[0]?.total || 0,
        brands: result.brands,
        sizes: result.sizes.map(s => s.value).filter(Boolean),
        units: result.units.map(u => u.value).filter(Boolean),
        materials: result.materials.map(m => m.value).filter(Boolean),
        stockAvailability: result.stockAvailability.map(s => s.inStock)
      }
    });

  } catch (error) {
    console.error("Error in getProductFilters:", error);
    res.status(500).json({ message: "Failed to fetch filters", error });
  }
};


// export const getBusinessAnalytics = async (req, res, next) => {
//   try {
//     const { id, type } = req.query;


//     let target;
//     if (type === 'Business') {
//       target = await businessregisterModel.findById(id);
//     } else if (type === 'User') {
//       target = await registerModel.findById(id);
//     } else {
//       return res.status(400).json({ success: false, message: "Invalid type" });
//     }

//     if (!target) {
//       return res.status(404).json({ success: false, message: `${type} not found` });
//     }

//     const views = await viewsModel.find({ viewed_page_id: id });
//     const totalVisitors = views.length;
//     console.log(views, "views");
//     const repeatVisitorsMap = {};

//     views.forEach(view => {
//       const viewerId = view.viewer_id.toString();
//       const viewCount = view.viewedAt.length;

//       repeatVisitorsMap[viewerId] = (repeatVisitorsMap[viewerId] || 0) + viewCount;
//     });

//     const repeatVisitorsCount = Object.values(repeatVisitorsMap).filter(count => count > 1).length;

//     console.log('Repeat Visitors:', repeatVisitorsCount);
//     const cityStats = await viewsModel.aggregate([
//       {
//         $match: { viewed_page_id: target._id }
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "viewer_id",
//           foreignField: "_id",
//           as: "user"
//         }
//       },
//       {
//         $lookup: {
//           from: "businessregisters",
//           localField: "viewer_id",
//           foreignField: "_id",
//           as: "business"
//         }
//       },
//       {
//         $addFields: {
//           // Handle case if location_id is an array, and take the first element
//           userLocationId: {
//             $toObjectId: { $arrayElemAt: ["$user.location_id", 0] }
//           }
//         }
//       },
//       {
//         $lookup: {
//           from: "locations",
//           localField: "userLocationId",
//           foreignField: "_id",
//           as: "location"
//         }
//       },
//       {
//         $addFields: {
//           city: {
//             $cond: [
//               { $gt: [{ $size: "$user" }, 0] },
//               {
//                 $toLower: {
//                   $trim: {
//                     input: {
//                       $ifNull: [
//                         { $arrayElemAt: ["$location.address.city", 0] },
//                         "" // Default to empty string if city is null
//                       ]
//                     }
//                   }
//                 }
//               },
//               {
//                 $toLower: {
//                   $trim: {
//                     input: {
//                       $ifNull: [
//                         { $arrayElemAt: ["$business.address.city", 0] },
//                         ""
//                       ]
//                     }
//                   }
//                 }
//               }
//             ]
//           }
//         }
//       },
//       {
//         $group: {
//           _id: "$city",
//           count: { $sum: 1 }
//         }
//       },
//       { $sort: { count: -1 } },
//       { $limit: 7 },
//       {
//         $project: {
//           _id: 0,
//           city: "$_id",
//           count: 1
//         }
//       }
//     ]);

//     console.log(cityStats, "cityStats")

//     const genderStats = await viewsModel.aggregate([
//       {
//         $match: {
//           viewed_page_id: target._id,
//           viewer_type: "User"
//         }
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "viewer_id",
//           foreignField: "_id",
//           as: "user"
//         }
//       },
//       { $unwind: "$user" },
//       {
//         $group: {
//           _id: "$user.gender",
//           count: { $sum: 1 }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           gender: "$_id",
//           count: 1
//         }
//       }
//     ]);

//     const ageCategory = await viewsModel.aggregate([
//       {
//         $match: {
//           viewed_page_id: target._id,
//           viewer_type: "User"
//         }
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "viewer_id",
//           foreignField: "_id",
//           as: "user"
//         }
//       },
//       { $unwind: "$user" },
//       {
//         $addFields: {
//           age: {
//             $floor: {
//               $divide: [
//                 {
//                   $subtract: [
//                     "$$NOW",
//                     {
//                       $dateFromString: {
//                         dateString: "$user.DOB",
//                         format: "%d-%m-%Y"
//                       }
//                     }
//                   ]
//                 },
//                 1000 * 60 * 60 * 24 * 365
//               ]
//             }
//           }
//         }
//       },
//       {
//         $addFields: {
//           ageRange: {
//             $switch: {
//               branches: [
//                 { case: { $lt: ["$age", 18] }, then: "Under 18" },
//                 { case: { $and: [{ $gte: ["$age", 18] }, { $lte: ["$age", 24] }] }, then: "18-24" },
//                 { case: { $and: [{ $gte: ["$age", 25] }, { $lte: ["$age", 34] }] }, then: "25-34" },
//                 { case: { $and: [{ $gte: ["$age", 35] }, { $lte: ["$age", 44] }] }, then: "35-44" },
//                 { case: { $and: [{ $gte: ["$age", 45] }, { $lte: ["$age", 54] }] }, then: "45-54" },
//                 { case: { $and: [{ $gte: ["$age", 55] }, { $lte: ["$age", 64] }] }, then: "55-64" }
//               ],
//               default: "65+"
//             }
//           }
//         }
//       },
//       {
//         $group: {
//           _id: "$ageRange",
//           count: { $sum: 1 }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           ageRange: "$_id",
//           count: 1
//         }
//       }
//     ]);


//     const interestCategory = await viewsModel.aggregate([
//       {
//         $match: {
//           viewed_page_id: target._id,
//           viewer_type: "User"
//         }
//       },
//       {
//         $lookup: {
//           from: "users",
//           localField: "viewer_id",
//           foreignField: "_id",
//           as: "user"
//         }
//       },
//       { $unwind: "$user" },
//       { $unwind: "$user.interest" },
//       {
//         $group: {
//           _id: "$user.interest",
//           count: { $sum: 1 }
//         }
//       },
//       { $sort: { count: -1 } },
//       { $limit: 7 },
//       {
//         $project: {
//           _id: 0,
//           interest: "$_id",
//           count: 1
//         }
//       }
//     ]);

//     res.status(200).json({
//       success: true,
//       message: "Analytics fetched successfully",
//       data: {
//         totalVisitors,
//         repeatVisitors: repeatVisitorsCount,
//         topCities: cityStats,
//         genderStats,
//         ageCategory,
//         interestCategory
//       }
//     });

//   } catch (error) {
//     console.error("Error fetching analytics:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching analytics",
//       error: error.message
//     });
//   }
// };


export const getBusinessAnalytics = async (req, res, next) => {
  try {
    const { id, type } = req.query;


    let target;
    if (type === 'Business') {
      target = await businessregisterModel.findById(id);
    } else if (type === 'User') {
      target = await registerModel.findById(id);
    } else {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }

    if (!target) {
      return res.status(404).json({ success: false, message: `${type} not found` });
    }

    const views = await viewsModel.find({ viewed_page_id: id });
    const totalVisitors = views.length;
    console.log(views, "views");
    const repeatVisitorsMap = {};

    views.forEach(view => {
      const viewerId = view.viewer_id.toString();
      const viewCount = view.viewedAt.length;

      repeatVisitorsMap[viewerId] = (repeatVisitorsMap[viewerId] || 0) + viewCount;
    });

    const repeatVisitorsCount = Object.values(repeatVisitorsMap).filter(count => count > 1).length;

    console.log('Repeat Visitors:', repeatVisitorsCount);
    const cityStats = await viewsModel.aggregate([
      {
        $match: { viewed_page_id: target._id }
      },
      {
        $lookup: {
          from: "users",
          localField: "viewer_id",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $lookup: {
          from: "businessregisters",
          localField: "viewer_id",
          foreignField: "_id",
          as: "business"
        }
      },
      {
        $addFields: {
          // Handle case if location_id is an array, and take the first element
          userLocationId: {
            $toObjectId: { $arrayElemAt: ["$user.location_id", 0] }
          }
        }
      },
      {
        $lookup: {
          from: "locations",
          localField: "userLocationId",
          foreignField: "_id",
          as: "location"
        }
      },
      {
        $addFields: {
          city: {
            $cond: [
              { $gt: [{ $size: "$user" }, 0] },
              {
                $toLower: {
                  $trim: {
                    input: {
                      $ifNull: [
                        { $arrayElemAt: ["$location.address.city", 0] },
                        "" // Default to empty string if city is null
                      ]
                    }
                  }
                }
              },
              {
                $toLower: {
                  $trim: {
                    input: {
                      $ifNull: [
                        { $arrayElemAt: ["$business.address.city", 0] },
                        ""
                      ]
                    }
                  }
                }
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: "$city",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 7 },
      {
        $project: {
          _id: 0,
          city: "$_id",
          count: 1
        }
      }
    ]);

    console.log(cityStats, "cityStats")

    const genderStats = await viewsModel.aggregate([
      {
        $match: {
          viewed_page_id: target._id,
          viewer_type: "User"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "viewer_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $group: {
          _id: "$user.gender",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          _id: "$_id",
          count: 1
        }
      }
    ]);

    const ageCategory = await viewsModel.aggregate([
      {
        $match: {
          viewed_page_id: target._id,
          viewer_type: "User"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "viewer_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $addFields: {
          age: {
            $floor: {
              $divide: [
                {
                  $subtract: [
                    "$$NOW",
                    {
                      $dateFromString: {
                        dateString: "$user.DOB",
                        format: "%d-%m-%Y"
                      }
                    }
                  ]
                },
                1000 * 60 * 60 * 24 * 365
              ]
            }
          }
        }
      },
      {
        $addFields: {
          ageRange: {
            $switch: {
              branches: [
                { case: { $lt: ["$age", 18] }, then: "Under 18" },
                { case: { $and: [{ $gte: ["$age", 18] }, { $lte: ["$age", 24] }] }, then: "18-24" },
                { case: { $and: [{ $gte: ["$age", 25] }, { $lte: ["$age", 34] }] }, then: "25-34" },
                { case: { $and: [{ $gte: ["$age", 35] }, { $lte: ["$age", 44] }] }, then: "35-44" },
                { case: { $and: [{ $gte: ["$age", 45] }, { $lte: ["$age", 54] }] }, then: "45-54" },
                { case: { $and: [{ $gte: ["$age", 55] }, { $lte: ["$age", 64] }] }, then: "55-64" }
              ],
              default: "65+"
            }
          }
        }
      },
      {
        $group: {
          _id: "$ageRange",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          ageRange: "$_id",
          count: 1
        }
      }
    ]);


    const interestCategory = await viewsModel.aggregate([
      {
        $match: {
          viewed_page_id: target._id,
          viewer_type: "User"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "viewer_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      { $unwind: "$user.interest" },
      {
        $group: {
          _id: "$user.interest",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 7 },
      {
        $project: {
          _id: 0,
          interest: "$_id",
          count: 1
        }
      }
    ]);
    const [newOrders,cancelledOrders, deliveredOrders, confirmedOrders] = await Promise.all([
      Order.countDocuments({ seller_id: id, order_status: "Pending" }),
      Order.countDocuments({ seller_id: id, order_status: "Cancelled" }),
      Order.countDocuments({ seller_id: id, order_status: "Delivered" }),
      Order.countDocuments({ seller_id: id, order_status: "Confirmed" }),
    ]);

    const orderSummary = {
      newOrders,
      cancelledOrders,
      deliveredOrders,
      confirmedOrders
    };


    res.status(200).json({
      success: true,
      message: "Analytics fetched successfully",
      data: {
        totalVisitors,
        repeatVisitors: repeatVisitorsCount,
        cityStats: cityStats,
        genderStats,
        ageCategory,
        orderSummary,
        interestCategory
      }
    });

  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching analytics",
      error: error.message
    });
  }
};


export const visitPage = async (req, res) => {
  const { viewer_id, viewed_page_id, viewer_type, viewed_page_account_type } = req.body;

  try {
    const time = new Date();
    let view = await viewsModel.findOne({ viewer_id, viewed_page_id });

    if (!view) {
      const newView = await viewsModel.create({
        viewer_id,
        viewed_page_id,
        viewer_type,
        viewedAt: [time],
        viewed_page_account_type,
        viewCount: 1,
      });

      // Also increment viewCount in the appropriate model
      if (viewed_page_account_type === false) {
        await registerModel.findByIdAndUpdate(viewed_page_id, { $inc: { viewCount: 1 } });
      } else {
        await businessregisterModel.findByIdAndUpdate(viewed_page_id, { $inc: { viewCount: 1 } });
      }

      return res.status(200).json({ success: true, data: newView });
    } else {
      view.viewedAt.push(time);
      view.viewCount += 1;
      await view.save();

      if (viewed_page_account_type === false) {
        await registerModel.findByIdAndUpdate(viewed_page_id, { $inc: { viewCount: 1 } });
      } else {
        await businessregisterModel.findByIdAndUpdate(viewed_page_id, { $inc: { viewCount: 1 } });
      }

      return res.status(200).json({ success: true, data: view });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};


export const deactivateProduct = async (req, res) => {
  const { product_id, status } = req.query;
  console.log(req.query, "Received query params");

  try {
    // Step 1: Update product status in the Product collection
    const updatedProduct = await Product.findByIdAndUpdate(
      product_id,
      { status },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ status: false, message: "Product not found" });
    }

    // Step 2: Update all posts where mediaItems contain this productId
    const updatedPosts = await createPostModel.updateMany(
      { 'mediaItems.productId': product_id },
      { $set: { Product_status: status } }
    );

    console.log(updatedPosts, 'Posts updated with new product status');

    res.status(200).json({
      status: true,
      message: "Deactivated successfully",
      data: {
        updatedProduct,
        updatedPostsCount: updatedPosts.modifiedCount
      }
    });
  } catch (error) {
    console.error(error, "Error deactivating product");
    res.status(500).json({ status: false, message: "Something went wrong", error });
  }
};

