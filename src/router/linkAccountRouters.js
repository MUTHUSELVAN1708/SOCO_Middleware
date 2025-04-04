import express from "express";
import { getLinkedAccounts, fetchAllUsers, linkAccount, confirmLink, rejectLink } from "../controller/linkAccountController.js";

const router = express.Router();

router.get("/getLinkedAccounts", getLinkedAccounts);
router.get("/fetchAllUsers", fetchAllUsers);
router.post("/linkAccount", linkAccount);
router.post("/confirmLink", confirmLink);
router.post("/rejectLink", rejectLink);

export default router;
