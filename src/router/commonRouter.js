import express from "express";
 import adminController from "../controller/adminController.js"


const router=express.Router();



router.post("/register",adminController.register);
router.post("/verifyEmail/:email",adminController.verifyEmail);//before register
router.post("/verifyOtp",adminController.verifyOtp);
router.post("/login",adminController.login);
router.post("/otpValidation",adminController.otpValidation)
router.put('/updateRegister',adminController.updateRegister);// save extra details
router.put("/forgotPassword",adminController.forgotPassword);
router.post("/BusinessRegister",adminController.BusinessRegister);

export default router;