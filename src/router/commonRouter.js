import express from "express";
import adminController from "../controller/adminController.js";
import multer from "multer";

const router = express.Router();

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Destination folder for uploads
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname); // Append a timestamp to avoid overwriting
    },
});

// Image-Only Upload Configuration
const uploadImages = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    },
});

// General File Upload Configuration (Images, Videos, PDFs, Excel, etc.)
const uploadFiles = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'image/jpeg',
            'image/jpg', 
            'image/png', 
            'image/gif',
            'video/mp4',
            'application/msword',
            'application/pdf',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type! Allowed types: JPEG, PNG, GIF, MP4, PDF, Excel.'), false);
        }
    },
});

// Routes
router.post("/register", adminController.register);
router.post("/verifyEmail/:email", adminController.verifyEmail); // Before register
router.post("/verifyOtp", adminController.verifyOtp);
router.post("/login", adminController.login);
router.post("/otpValidation", adminController.otpValidation);
router.put('/updateRegister', adminController.updateRegister); // Save extra details
router.put("/forgotPassword", adminController.forgotPassword);
router.post("/BusinessRegister", adminController.BusinessRegister);
router.post("/registerUserWithBusiness", adminController.registerUserWithBusiness);

// Image Upload Route
router.post(
    "/imgUpload", 
    uploadImages.fields([
        { name: 'brand_logo' },
        { name: 'cover_img' },
        { name: 'pan_img' },
        { name: 'aadhar_img' },
        { name: 'profile_url' },
    ]), 
    adminController.imgUpload
);

// General File Upload Route
router.post(
    "/fileUpload",
    uploadFiles.single('file'),
    (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded!' });
            }

            const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
            res.status(200).json({
                message: 'File uploaded successfully!',
                fileUrl,
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // ========
    router.get("/searchRecommendation",adminController.searchRecommendation));
    router.post("/friendRequest",adminController.friendRequest);
    router.post("/post",adminController.createpost);
    router.get("/getPosts/:id",adminController.getPosts);

    router.post("/followUser",adminController.followUser);
    router.post("/unfollowUser",adminController.unfollowUser);
    router.get("/getFollowers/:id",adminController.getFollowers);
    router.get("/getFollowing/:id",adminController.getFollowing);
    router.put("/AcceptRequest",adminController.AcceptRequest);

    router.get("/suggestUsers/:id",adminController.suggestUsers);

export default router;
