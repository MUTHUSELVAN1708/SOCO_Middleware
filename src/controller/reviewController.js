import Order from "../model/orderModel.js";
import Product from "../model/Product.js";
import registerModel from "../model/registerModel.js";
import ReviewModel from "../model/reviewModel.js";
import mongoose from "mongoose";


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
                    user_id,
                    productId,
                    rating,
                    reviewText: reviewText,
                    images: images || []
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





export const getReviewDetails = async (req, res) => {
    try {
        const { productId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const skip = (page - 1) * limit;

        const totalReviews = await ReviewModel.countDocuments({ productId });

        const reviews = await ReviewModel.find({ productId })
            .select('user_id rating reviewText images isEdited helpfulCount createdAt isVerifiedPurchase replies')
            .sort({ createdAt: -1 })  // ← NEW TO OLD
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


