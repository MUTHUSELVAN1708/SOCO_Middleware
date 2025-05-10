import express from "express";
const router = express.Router();

import { likeItem ,getUserLikes} from "../controller/likeController.js"


router.post('/media-like', likeItem);
router.get('/user/:userId/likes', getUserLikes);


export default router