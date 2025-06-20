import Order from "../model/orderModel.js";
import Product from "../model/Product.js";
import registerModel from "../model/registerModel.js";
import ReviewModel from "../model/reviewModel.js";
import ReviewHelpfulModel from '../model/ReviewHelpfulModel.js';
import mongoose from "mongoose";
import createPostModel from "../model/createPostModel.js";
import viewsModel from "../model/VisitModel.js";


export const createReview = async (req, res) => {
  try {
    const { productId, user_id, isBusinessAccount, rating, reviewText, images } = req.body;

    const order = await Order.findOne({
      user_id,
      product_id: productId,
      order_status: 'Delivered'
    });

    if (!order) {
      return res.status(403).json({ message: 'You can only review purchased products.' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let user;

    if (isBusinessAccount) {
      user = await BusinessModel.findById(user_id).select("businessName brand_logo lastOnline");
      if (!user) {
        return res.status(404).json({ message: 'Business account not found' });
      }
    } else {
      user = await registerModel.findById(user_id).select("full_Name profile_url lastOnline");
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
    }

    const newReview = {
      id: new mongoose.Types.ObjectId().toString(),
      userName: isBusinessAccount ? user.businessName : user.full_Name || 'Anonymous',
      userAvatar: isBusinessAccount ? user.brand_logo : user.profile_url || '',
      rating: rating,
      review: reviewText,
      datePosted: new Date(),
      isVerifiedPurchase: true,
      reviewImages: images || [],
      replies: [],
      helpfulCount: 0,
      isEdited: false
    };

    product.ratings.reviews.push(newReview);
    product.ratings.reviews = product.ratings.reviews.slice(-5);

    const totalReviews = product.ratings.totalReviews + 1;
    const currentTotalRating = product.ratings.averageRating * product.ratings.totalReviews;
    const newAverageRating = (currentTotalRating + rating) / totalReviews;

    product.ratings.totalReviews = totalReviews;
    product.ratings.averageRating = newAverageRating;

    const ratingKey = rating.toString();
    const currentDistribution = product.ratings.ratingDistribution.get(ratingKey) || 0;
    product.ratings.ratingDistribution.set(ratingKey, currentDistribution + 1);

    try {
      await product.save();
    } catch (saveError) {
      console.error("Error saving product:", saveError);
      if (saveError.errors && saveError.errors.status) {
        product.status = 'draft';
        await product.save();
      } else {
        throw saveError;
      }
    }

    try {
      if (typeof ReviewModel !== 'undefined' && ReviewModel) {
        await ReviewModel.create({
          _id: newReview.id,
          user_id,
          productId,
          rating,
          reviewText,
          images: images || [],
          replies: [],
          isVerifiedPurchase: true,
          isEdited: false,
          datePosted: newReview.datePosted
        });
      }

    } catch (reviewModelError) {
      console.error("Error saving to ReviewModel:", reviewModelError);
    }

    res.status(201).json({
      message: 'Review added successfully',
      review: newReview
    });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ message: 'Failed to add review', error: error.message });
  }
};

export const addReply = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userName, userAvatar, reply, isSellerResponse, productId } = req.body;

    const newReply = {
      id: new mongoose.Types.ObjectId().toString(),
      userName: userName || 'Anonymous',
      userAvatar: userAvatar || '',
      reply,
      datePosted: new Date(),
      isSellerResponse: isSellerResponse || false,
      isEdited: false,
    };

    // Update in ReviewModel
    const review = await ReviewModel.findByIdAndUpdate(
      reviewId,
      { $push: { replies: newReply } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: 'Review not found in ReviewModel' });
    }

    // Update in Product top 5 reviews
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const targetReview = product.ratings.reviews.find(r => r.id === reviewId);
    if (targetReview) {
      targetReview.replies.push(newReply);
      await product.save();
    }

    res.status(200).json({
      message: 'Reply added successfully',
      reply: newReply
    });
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ message: 'Failed to add reply', error: error.message });
  }
};



export const addHelpfulCount = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { userId, isBusinessAccount, productId } = req.body;

    const existing = await ReviewHelpfulModel.findOne({
      reviewId,
      userId,
      isBusinessAccount
    });

    if (existing) {
      return res.status(409).json({ message: 'You have already marked this review as helpful.' });
    }

    // Add helpful record
    await ReviewHelpfulModel.create({
      reviewId,
      userId,
      isBusinessAccount
    });

    // Count actual helpful votes from ReviewHelpfulModel
    const actualHelpfulCount = await ReviewHelpfulModel.countDocuments({ reviewId });

    // Update ReviewModel with accurate count
    const review = await ReviewModel.findByIdAndUpdate(
      reviewId,
      { helpfulCount: actualHelpfulCount },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Update the embedded review in Product model
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const targetReview = product.ratings?.reviews?.find(r => r.id === reviewId);
    if (targetReview) {
      targetReview.helpfulCount = actualHelpfulCount;
      await product.save();
    }

    res.status(200).json({
      message: 'Helpful count updated',
      helpfulCount: actualHelpfulCount
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Duplicate helpful vote.' });
    }

    console.error('Error updating helpful count:', error);
    res.status(500).json({ message: 'Failed to update helpful count', error: error.message });
  }
};


export const getReviewDetails = async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const totalReviews = await ReviewModel.countDocuments({ productId });

    const reviews = await ReviewModel.find({ productId })
      .select('user_id rating reviewText images isEdited helpfulCount createdAt isVerifiedPurchase replies')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);


    const userIds = reviews.map(r => r.user_id);
    const userdetails = await registerModel.find({ _id: { $in: userIds } }).select('full_Name profile_url');

    const reviewsWithUser = reviews.map(review => {
      const user = userdetails.find(u => u._id.toString() === review.user_id.toString());
      return {
        id: review._id,
        userName: user?.full_Name ?? '',
        userAvatar: user?.profile_url ? `${user.profile_url}` : '',
        rating: review.rating,
        review: review.reviewText,
        datePosted: review.createdAt,
        isVerifiedPurchase: review.isVerifiedPurchase || true,
        reviewImages: (review.images || []).map(img => `${img}`),
        helpfulCount: review.helpfulCount || 0,
        isEdited: review.isEdited || false,
        replies: review.replies || []
      };
    });

    const totalPages = Math.ceil(totalReviews / limit);
    const hasMore = page < totalPages;

    res.status(200).json({
      reviews: reviewsWithUser,
      currentPage: page,
      totalPages,
      totalReviews,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};



export const getReviewAndViewCount = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }


    const getProductPosts = await createPostModel
      .find({ userId })
      .select("productId");

    const productIds = getProductPosts
      .map(p => p.productId)
      .filter(id => id);


    const reviews = await ReviewModel.find({
      productId: { $in: productIds }
    });
    const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    const avgRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(2) : 0;

    const views = await viewsModel.find({ viewed_page_id: userId });
    const totalVisitors = views.length;

    return res.status(200).json({
      totalVisitors,
      totalReviews: reviews.length,
      averageRating: parseFloat(avgRating),

    });

  } catch (error) {
    console.error("Error in getReviewAndViewCount:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


