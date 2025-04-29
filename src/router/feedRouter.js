import express from 'express';
import { getDashboardFeed ,suggestion} from '../controller/feedController.js';


const router = express.Router();
router.post('/dashboard-feed', getDashboardFeed);
router.get("/getRecommendedFollow",suggestion)
export default router;
