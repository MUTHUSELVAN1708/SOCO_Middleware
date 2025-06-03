import express from "express";
import { createReview, getReviewDetails, addReply, addHelpfulCount } from "../controller/reviewController.js";


const router = express.Router();

router.post("/createReview", createReview);
router.get("/getReviewDetails/:productId", getReviewDetails);
router.post("/addReply/:reviewId", addReply);
router.post("/addHelpfulCount/:reviewId", addHelpfulCount);

export default router;