import express from "express";
import { getAllServices, getPopularServices, getCategories,getAllProviders } from "../controller/serviceController.js";

const router = express.Router();

router.get("/all", getAllServices);
router.get("/popular", getPopularServices);
router.post("/getAllProviders", getAllProviders);
router.get("/categories", getCategories);

export default router;
