import express from "express";
 import adminController from "../controller/adminController.js"

const router=express.Router();

router.get("/getPendingStatus",adminController.getPendingStatus);//for admin
router.put("/updateBusinessStatus",adminController.updateBusinessStatus);//for admin



// router.post("/createProduct",adminController.createProduct);
// router.get("/getproduct",adminController.getproduct);
// router.put("/updateProduct",adminController.updateProduct);
// router.delete("/deleteProduct",adminController.deleteProduct);

router.post("/payment",adminController.payment);
router.post("/checkout",adminController.checkout);
router.get("/getOrderHistory/:user_id",adminController.getOrderHistory);
router.put("/updateOrderStatus/:checkout_id",adminController.updateOrderStatus);


router.post("/wishlist",adminController.wishlist);
router.get("/getWishlist/:id",adminController.getWishlist)
router.delete("/deleteWishlist",adminController.deleteWishlist);

router.get("/getAllUser",adminController.getAllUser);
export default router