import express from "express";
 import adminController from "../controller/adminController.js"

const router=express.Router();

router.get("/getPendingStatus",adminController.getPendingStatus);//for admin
router.put("/updateBusinessStatus",adminController.updateBusinessStatus);//for admin


export default router