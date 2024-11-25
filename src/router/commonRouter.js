import express from "express";
 import adminController from "../controller/adminController.js"

 import multer from "multer";
const router=express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Destination folder for uploads
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // Append a timestamp to avoid overwriting
    },
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        // Allow only image file types
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});


router.post("/register",adminController.register);
router.post("/verifyEmail/:email",adminController.verifyEmail);//before register
router.post("/verifyOtp",adminController.verifyOtp);
router.post("/login",adminController.login);
router.post("/otpValidation",adminController.otpValidation)
router.put('/updateRegister',adminController.updateRegister);// save extra details
router.put("/forgotPassword",adminController.forgotPassword);
router.post("/BusinessRegister",adminController.BusinessRegister);
router.post("/imgUpload",upload.fields([
    { name: 'brand_logo' },  
    { name: 'cover_img' },
    { name: 'pan_img' },
    { name: 'aadhar_img' },
    {name:'profile_img'}
]),adminController.imgUpload);

export default router;