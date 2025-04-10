import express from "express";

import { getLinkedAccounts, fetchAllUsers, linkAccount, confirmLink, rejectLink,updateLinkStatus,storeNotificationMessage,markNotificationAsRead } from "../controller/linkAccountController.js";

// import { getLinkedAccounts, fetchAllUsers, linkAccount, confirmLink, rejectLink ,storeNotificationMessage} from "../controller/linkAccountController.js";


const router = express.Router();

router.get("/getLinkedAccounts", getLinkedAccounts);
router.get("/fetchAllUsers", fetchAllUsers);
router.post("/markNotificationAsRead", markNotificationAsRead);
router.post("/updateLinkStatus", updateLinkStatus);
router.post("/linkAccount", linkAccount);
router.post("/confirmLink", confirmLink);
router.post("/rejectLink", rejectLink);


router.post("/storeNotificationMessage",storeNotificationMessage)
export default router;
