import express from "express";
import { addMessage, deleteMessage,fetchChatMembers } from "../controller/chatMessageController.js";

const router = express.Router();

// Route to add a message
router.post("/add", addMessage);
router.get("/fetchChatMembers", fetchChatMembers);

// Route to delete a message by ID
router.delete("/delete/:id", deleteMessage);

export default router;
