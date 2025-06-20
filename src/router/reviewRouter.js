import express from "express";
import { createReview, getReviewDetails, addReply, addHelpfulCount,getReviewAndViewCount } from "../controller/reviewController.js";


const router = express.Router();

router.post("/createReview", createReview);
router.get("/getReviewDetails/:productId", getReviewDetails);
router.post("/addReply/:reviewId", addReply);
router.post("/addHelpfulCount/:reviewId", addHelpfulCount);
router.get("/getReviewAndViewCount/:userId",getReviewAndViewCount);

export default router;