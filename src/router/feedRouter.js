import express from 'express';
import { getDashboardFeed,suggestion,trackViewedPost } from '../controller/feedController.js';


const router = express.Router();
router.post('/dashboard-feed', getDashboardFeed);
router.get("/getRecommendedFollow",suggestion)
router.post("/track", trackViewedPost);
export default router;
