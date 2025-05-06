import Product from '../model/Product.js';
import { validateProduct } from '../utils/validators.js';
import adminService from '../service/adminService.js';
import mongoose from 'mongoose';
import { handleError } from '../utils/responseHandler.js';

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


export const getProductDetail = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json(
        formatResponse(false, ERROR_MESSAGES.PRODUCT.NOT_FOUND)
      );
    }

    const product = await Product.findById(productId).exec();

    if (!product) {
      return res.status(404).json(
        formatResponse(false, ERROR_MESSAGES.PRODUCT.NOT_FOUND)
      );
    }

    // Transform reviews into the expected format
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

    // Transform rating distribution into the expected format
    const ratingDistribution = {};
    product.ratings.ratingDistribution.forEach((value, key) => {
      ratingDistribution[key] = value;
    });

    const productDetailResponse = {
      productTitle: product.basicInfo.productTitle,
      brand: product.basicInfo.brand,
      categories: product.basicInfo.categories,
      tags: product.basicInfo.tags || [],
      images: product.images,
      unit: product.unit,
      description: product.descriptionHighlights.description,
      highlights: product.descriptionHighlights.highlights,
      pricing: {
        regularPrice: product.pricing.regularPrice.toString(),
        salePrice: product.pricing.salePrice ? product.pricing.salePrice.toString() : null,
        discount: product.pricing.discount,
        currency: product.pricing.currency === 'INR' ? '₹' : product.pricing.currency,
        gstIncluded: product.pricing.gstDetails.gstIncluded,
        gstPercentage: product.pricing.gstDetails.gstPercentage,
      },
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
    // Fetch products with categories and images
    const products = await Product.find({ createdBy }).select("basicInfo.categories images");

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
      category, 
      sortBy, 
      color, 
      discount, 
      priceRange, 
      createdBy 
    } = req.query;

    // Ensure the createdBy is passed
    if (!createdBy) {
      return res.status(400).json({ message: "createdBy is required." });
    }

    // Convert createdBy to ObjectId if it's not already
    const createdByObjectId = new mongoose.Types.ObjectId(createdBy);

    // Step 1: Start with match for creator only
    const pipeline = [
      {
        $match: {
          createdBy: createdByObjectId
        }
      }
    ];

    // Debugging: Check the pipeline
    console.log("Aggregation Pipeline (Step 1): ", pipeline);

    // Optional: Apply discount filter if provided
    if (discount) {
      pipeline.push({
        $match: {
          $expr: {
            $gte: [{ $toDouble: "$pricing.discount" }, Number(discount)]
          }
        }
      });
    }

    // Optional: Apply additional filters (category, color)
    const additionalFilter = {};

    if (category) {
      additionalFilter["basicInfo.categories." + category] = { $exists: true };
    }

    if (color) {
      additionalFilter["variants.color"] = color;
    }

    if (Object.keys(additionalFilter).length > 0) {
      pipeline.push({ $match: additionalFilter });
    }

    // Project fields to be returned
    pipeline.push({
      $project: {
        image: { $arrayElemAt: ["$images", 0] },
        stock: "$availability.inStock",
        stockQuantity: "$availability.stockQuantity",
        amount: { $toDouble: "$pricing.salePrice" },
        brand: "$basicInfo.brand",
        productTitle: "$basicInfo.productTitle",
        createdAt: 1,
        discount: "$pricing.discount",
        postCommentsCount: 1,
        "ratings.averageRating": 1
      }
    });

    // Apply price range if provided
    if (priceRange) {
      const [minPrice, maxPrice] = priceRange.split(',').map(Number);
      pipeline.push({
        $match: {
          $expr: {
            $and: [
              { $gte: ["$amount", minPrice] },
              { $lte: ["$amount", maxPrice] }
            ]
          }
        }
      });
    }

    // Sorting logic
    let sort = {};
    switch (sortBy) {
      case 'lowToHigh':
        sort = { amount: 1 };
        break;
      case 'highToLow':
        sort = { amount: -1 };
        break;
      case 'whatsNew':
        sort = { createdAt: -1 };
        break;
      case 'discount':
        sort = { discount: -1 };
        break;
      case 'popularity':
        sort = { postCommentsCount: -1, 'ratings.averageRating': -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    pipeline.push({ $sort: sort });

    // Debugging: Check the final pipeline before aggregation
    console.log("Final Aggregation Pipeline: ", pipeline);

    // Execute aggregation
    const products = await Product.aggregate(pipeline);

    // Debugging: Check if any products are returned
    console.log("Returned Products: ", products);

    res.status(200).json({ products });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong', error });
  }
};





