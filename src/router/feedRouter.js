import express from 'express';
import { getDashboardFeed } from '../controller/feedController.js';


const router = express.Router();
router.post('/dashboard-feed', getDashboardFeed);

export default router;
