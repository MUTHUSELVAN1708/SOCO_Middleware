import express from "express";
import adminController from "../controller/adminController.js";
import multer from "multer"; 
import registerModel from '../model/registerModel.js';
import businessRegisterModel from '../model/BusinessModel.js';

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
const allowedAccountTypes = ['user', 'business']; 
const allowedFields = ['profile_url', 'avatar_url'];
// General File Upload Route
router.post(
    "/fileUploadByAccountType",
    uploadFiles.single('file'),
    async (req, res) => {
  
      try {
        const { accountType, id, fieldName } = req.body;
  
        // Check if file is uploaded
        if (!req.file) {
          console.warn('No file uploaded in request.');
          return res.status(422).json({ message: 'No file uploaded!' });
        }
        // Validate required parameters
        if (!accountType || !id || !fieldName) {
          console.error('Missing required parameters:', { accountType, id, fieldName });
          return res.status(400).json({ message: 'Missing required parameters!' });
        }
  
        // Validate account type
        if (!allowedAccountTypes.includes(accountType)) {
          console.error(`Invalid account type provided: ${accountType}`);
          return res.status(400).json({ message: 'Invalid account type!' });
        }
  
        // Validate field name
        if (!allowedFields.includes(fieldName)) {
          console.error(`Invalid field name provided: ${fieldName}`);
          return res.status(400).json({ message: `Invalid field name: ${fieldName}` });
        }
  
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  
        if (accountType === 'user') {
          const user = await registerModel.findById(id);
          if (!user) {
            console.warn(`User not found for ID: ${id}`);
            return res.status(404).json({ message: 'User not found!' });
          }
  
          user[fieldName] = fileUrl;
          await user.save();
          return res.status(200).json({
            message: 'File uploaded and user updated successfully!',
            fileUrl,
          });
        } else if (accountType === 'business') {
          const business = await businessRegisterModel.findById(id);
          if (!business) {
            console.warn(`Business not found for ID: ${id}`);
            return res.status(404).json({ message: 'Business not found!' });
          }
  
          business[fieldName] = fileUrl;
          await business.save();
          return res.status(200).json({
            message: 'File uploaded and business updated successfully!',
            fileUrl,
          });
        } else {
          console.error(`Unhandled account type: ${accountType}`);
          return res.status(400).json({ message: 'Invalid account type!' });
        }
      } catch (error) {
        console.error('Error during file upload:', {
          message: error.message,
          stack: error.stack,
        });
        res.status(500).json({ message: 'Internal server error.' });
      }
    }
  );
  
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
