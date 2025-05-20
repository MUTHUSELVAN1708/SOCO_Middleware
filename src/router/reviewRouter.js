import express from "express";
import {createReview,getReviewDetails} from "../controller/reviewController.js";

const router = express.Router();

router.post("/createReview", createReview); 
router.get("/getReviewDetails/:productId",getReviewDetails);

export default router;