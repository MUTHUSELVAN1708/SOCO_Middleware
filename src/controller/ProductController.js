import Product from '../model/Product.js';
import { validateProduct } from '../utils/validators.js';
import mongoose from 'mongoose';

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
          imageUrl:crossSell.imageUrl,
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
  
      // Normalize SKUs to lowercase to prevent case-sensitive duplicates
      if (productData.variants) {
        productData.variants = productData.variants.map(variant => ({
          ...variant,
          sku: variant.sku.toLowerCase()
        }));
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
  
        // Check for duplicate SKUs before updating
        if (productData.variants) {
          const skus = productData.variants.map(v => v.sku);
          const existingSku = await Product.findOne({
            _id: { $ne: productId },
            'variants.sku': { $in: skus }
          });
          
          if (existingSku) {
            return res.status(409).json(
              formatResponse(false, `Duplicate SKU found in another product`)
            );
          }
        }
  
        product = await Product.findOneAndUpdate(
          { _id: productId },
          { $set: productData },
          { new: true, runValidators: true }
        );
        responseMessage = 'Product updated successfully';
      } else {
        // Check for duplicate SKUs before creating
        if (productData.variants) {
          const skus = productData.variants.map(v => v.sku);
          console.log(skus);
          const existingSku = await Product.findOne({
            'variants.sku': { $in: skus }
          });
          console.log(existingSku);
          if (existingSku) {
            console.log('running without sku');
            return res.status(409).json(
              formatResponse(false, `Duplicate SKU found in another product`)
            );
          }
        }

  
        product = await Product.create({
          ...productData,
          ratings: defaultRatings,
          createdBy: userId,
        });
        responseMessage = 'Product created successfully';
      }
  
      return res.status(200).json(formatResponse(true, responseMessage, { productId: product._id }));
    } catch (error) {
      // console.error('Error in createAndUpdateProduct:', error);
      
      if (error.code === 11000) {
        return res.status(409).json(
          formatResponse(false, `Duplicate SKU found. Each variant must have a unique SKU.`)
        );
      }
  
      return res.status(500).json(formatResponse(false, 'Server error', null, [{ message: error.message }]));
    }
  };
  
  
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