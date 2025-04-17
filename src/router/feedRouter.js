import express from 'express';
import { getDashboardFeed ,getRecommendedFollow} from '../controller/feedController.js';


const router = express.Router();
router.post('/dashboard-feed', getDashboardFeed);
router.get("/getRecommendedFollow",getRecommendedFollow);
export default router;
