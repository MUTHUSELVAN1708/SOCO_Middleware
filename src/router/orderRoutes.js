import express from "express";
import {
    createOrder,
    getPendingOrders,
    getPendingApprovedOrderList,
    cancelOrderByUser,
    confirmOrderBySeller,
    cancelOrderBySeller,
    rejectOrderByUser,
    confirmOrderByUser,
    getOrderById,
    getOrdersByUser,
    updateOrderStatus,
    deleteOrder
} from "../controller/orderController.js";

const router = express.Router();

router.post("/", createOrder); 
router.get("/getPendingOrders", getPendingOrders); 
router.get("/getPendingApprovedOrderList", getPendingApprovedOrderList); 
router.post("/confirmOrderBySeller", confirmOrderBySeller); 
router.post("/cancelOrderByUser", cancelOrderByUser);
router.post("/rejectOrderByUser", rejectOrderByUser);
router.post("/confirmOrderByUser", confirmOrderByUser);
router.post("/cancelOrderBySeller", cancelOrderBySeller); 
router.get("/:orderId", getOrderById); 
router.get("/user/:userId", getOrdersByUser); 
router.put("/:orderId", updateOrderStatus); 
router.delete("/:orderId", deleteOrder); 

export default router;
