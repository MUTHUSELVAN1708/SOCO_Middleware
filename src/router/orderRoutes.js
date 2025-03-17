import express from "express";
import {
    createOrder,
    getPendingOrders,
    confirmOrderBySeller,
    cancelOrderBySeller,
    getOrderById,
    getOrdersByUser,
    updateOrderStatus,
    deleteOrder
} from "../controller/orderController.js";

const router = express.Router();

router.post("/", createOrder); 
router.get("/getPendingOrders", getPendingOrders); 
router.post("/confirmOrderBySeller", confirmOrderBySeller); 
router.post("/cancelOrderBySeller", cancelOrderBySeller); 
router.get("/:orderId", getOrderById); 
router.get("/user/:userId", getOrdersByUser); 
router.put("/:orderId", updateOrderStatus); 
router.delete("/:orderId", deleteOrder); 

export default router;
