import express from "express";
import {
    createOrder,
    getOrderById,
    getOrdersByUser,
    updateOrderStatus,
    deleteOrder
} from "../controller/orderController.js";

const router = express.Router();

router.post("/", createOrder); 
router.get("/:orderId", getOrderById); 
router.get("/user/:userId", getOrdersByUser); 
router.put("/:orderId", updateOrderStatus); 
router.delete("/:orderId", deleteOrder); 

export default router;
