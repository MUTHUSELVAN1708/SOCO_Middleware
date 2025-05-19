import Order from "../model/orderModel.js";
import Product from "../model/Product.js";
import registerModel from "../model/registerModel.js";
import ReviewModel from "../model/reviewModel.js";


export const createReview = async (req, res) => {
    try {
        const { productId, user_id, rating, reviewText, images } = req.body;

        const order = await Order.findOne({
            user_id,
            product_id: productId,
            order_status: 'Delivered'
        });
        console.log(order, "preder")
        if (!order) {
            return res.status(403).json({ message: 'You can only review purchased products.' });
        }

        const review = await ReviewModel.create({ user_id, productId, rating, reviewText, images });
        
         await Product.findByIdAndUpdate(productId, {
            $inc: { 'ratings.totalReviews': 1 }
        });
        res.status(201).json({ message: 'Review added', review });
       
    } catch (error) {
        res.status(500).json({ message: ' failed to add Review ', });
        console.log(error)
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
            .select('user_id rating reviewText')
            .sort({ rating: -1 })
            .skip(skip)
            .limit(limit);

        const userIds = reviews.map(review => review.user_id);

        const userdetails = await registerModel.find({ _id: { $in: userIds } }).select('full_Name profile_url');

        const reviewsWithUser = reviews.map(review => {
            const user = userdetails.find(u => u._id.toString() === review.user_id.toString());
            return {
                ...review._doc,
                user: user ? {
                    full_Name: user.full_Name,
                    profile_url: user.profile_url
                } : null
            };
        });

        res.status(200).json({

            reviews: reviewsWithUser,
            currentPage: page,
            totalPages: Math.ceil(totalReviews / limit),
            totalReviews,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};
