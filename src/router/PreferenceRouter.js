import express from "express";
import { toggleFriend , toggleFollow , getFriendRequests , manageFriendStatus} from "../controller/PreferenceController.js";

const router = express.Router();

router.post("/toggleFriend", toggleFriend); 
router.post("/toggleFollow", toggleFollow); 
router.post("/manageFriendStatus", manageFriendStatus);
router.get("/getFriendRequests", getFriendRequests); 

export default router;