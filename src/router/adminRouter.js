import express from "express";
 import adminController from "../controller/adminController.js"

const router=express.Router();

router.get("/getPendingStatus",adminController.getPendingStatus);//for admin
router.put("/updateBusinessStatus",adminController.updateBusinessStatus);//for admin



// router.post("/createProduct",adminController.createProduct);
// router.get("/getproduct",adminController.getproduct);
// router.put("/updateProduct",adminController.updateProduct);
// router.delete("/deleteProduct",adminController.deleteProduct);





export default router