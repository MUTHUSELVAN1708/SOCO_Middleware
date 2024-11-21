import express from "express";
 import adminController from "../controller/adminController.js"
import multer from "multer";

const router=express.Router();


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/'); // Directory where images will be stored
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname); // Unique filename
    },
  });
  
  const upload = multer({ storage });
  
router.post("/register",adminController.register);
router.post("/login",adminController.login);
router.post("/otpValidation",adminController.otpValidation)
router.put('/updateRegister', upload.single('profile_img'), adminController.updateRegister);// save extra details
router.put("/forgotPassword",adminController.forgotPassword);
router.post("/BusinessRegister", upload.fields([
    { name: 'brand_logo' },  
    { name: 'cover_img'}  
  ]),adminController.BusinessRegister);

export default router;