import express from "express";
import adminController from "../controller/adminController.js";
import multer from "multer";
import { v4 as uuidv4 } from "uuid"; 
import registerModel from '../model/registerModel.js';
import businessRegisterModel from '../model/BusinessModel.js';

const router = express.Router();

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
// Media Multer Storage Configuration
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine destination folder based on file type
    const folder = file.mimetype.startsWith('image') ? 'images' : 'videos';
    cb(null, `uploads/${folder}`);
  },
  filename: (req, file, cb) => {
    // Generate a unique file name using UUID
    const uniqueName = `${uuidv4()}.${file.mimetype.split('/')[1]}`;
    console.log(uniqueName);
    cb(null, uniqueName);
  }
});

// File Upload Configuration (Images and Videos)
const uploadMedia = multer({
  storage: mediaStorage, // Fix here
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'video/mp4', 'video/mpeg', 'video/avi',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type! Allowed types: Images and Videos.'), false);
  },
});


// Image-Only Upload Configuration
const uploadImages = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed!'), false);
    },
});

// General File Upload Configuration
const allowedMimeTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
    'video/mp4', 'application/msword', 'application/pdf', 
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const uploadFiles = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (allowedMimeTypes.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Invalid file type! Allowed types: JPEG, PNG, GIF, MP4, PDF, Excel.'), false);
    },
});

// Routes
router.post("/register", adminController.register);
router.post("/verifyEmail/:email", adminController.verifyEmail);
router.post("/verifyOtp", adminController.verifyOtp);
router.post("/login", adminController.login);
router.post("/otpValidation", adminController.otpValidation);
router.put('/updateRegister', adminController.updateRegister);
router.put("/forgotPassword", adminController.forgotPassword);
router.post("/BusinessRegister", adminController.BusinessRegister);
router.post("/registerUserWithBusiness", adminController.registerUserWithBusiness);
router.post("/updateBusinessProfile", adminController.updateBusinessProfile);



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

// General File Upload Route with Account Type
router.post(
    "/fileUploadByAccountType",
    uploadFiles.single('file'),
    async (req, res) => {
        try {
            const { accountType, id, fieldName } = req.body;

            if (!req.file) return res.status(422).json({ message: 'No file uploaded!' });
            if (!accountType || !id || !fieldName) return res.status(400).json({ message: 'Missing required parameters!' });
            if (!allowedAccountTypes.includes(accountType)) return res.status(400).json({ message: 'Invalid account type!' });
            if (!allowedFields.includes(fieldName)) return res.status(400).json({ message: `Invalid field name: ${fieldName}` });

            const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

            if (accountType === 'user') {
                const user = await registerModel.findById(id);
                if (!user) return res.status(404).json({ message: 'User not found!' });
                user[fieldName] = fileUrl;
                await user.save();
                return res.status(200).json({ message: 'File uploaded and user updated successfully!', fileUrl });
            }

            if (accountType === 'business') {
                const business = await businessRegisterModel.findById(id);
                if (!business) return res.status(404).json({ message: 'Business not found!' });
                business[fieldName] = fileUrl;
                await business.save();
                return res.status(200).json({ message: 'File uploaded and business updated successfully!', fileUrl });
            }

            return res.status(400).json({ message: 'Invalid account type!' });
        } catch (error) {
            res.status(500).json({ message: 'Internal server error.', error: error.message });
        }
    }
);



// Simple File Upload Route
router.post(
    "/fileUpload",
    uploadFiles.single('file'),
    (req, res) => {
        try {
            if (!req.file) return res.status(400).json({ message: 'No file uploaded!' });
            const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
            res.status(200).json({ message: 'File uploaded successfully!', fileUrl });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);

// Media Upload Route (Images and Videos)
router.post(
  "/uploadMedia",
  uploadMedia.fields([
    { name: 'image', maxCount: 5 },
    { name: 'video', maxCount: 2 },
  ]),
  async (req, res) => {
    try {
      const files = req.files;
      console.log('Initialized');
      if (!files || (!files.image && !files.video)) {
        return res.status(400).json({ message: 'No media files uploaded!' });
      }

      const response = {};

      if (files.image) {
        response.images = files.image.map((file) => ({
          fileName: file.originalname,
          filePath: `${req.protocol}://${req.get('host')}/uploads/images/${encodeURIComponent(file.filename)}`,
        }));
      }
      
      if (files.video) {
        response.videos = files.video.map((file) => ({
          originalFileName: file.originalname,
          uniqueId: file.filename,
          filePath: `${req.protocol}://${req.get('host')}/uploads/videos/${encodeURIComponent(file.filename)}`,
        }));
      }
      

      return res.status(200).json({
        message: 'Media uploaded successfully!',
        media: response,
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error.', error: error.message });
    }
  }
);


// Social Features
router.get("/searchRecommendation", adminController.searchRecommendation);
router.post("/friendRequest", adminController.friendRequest);
router.post("/createPost", adminController.createpost);
router.post("/updateUserDetails/:id", adminController.updateUserDetails);
router.post("/addAndUpdateBio/:id", adminController.addAndUpdateBio);
router.get("/getPosts/:id", adminController.getPosts);
router.post("/followUser", adminController.followUser);
router.post("/unfollowUser", adminController.unfollowUser);
router.get("/getFollowers/:id", adminController.getFollowers);
router.get("/getTopFollowersById/:id", adminController.getTopFollowersById);
router.get("/getFollowing/:id", adminController.getFollowing);
router.put("/AcceptRequest", adminController.AcceptRequest);
router.get("/suggestUsers/:id", adminController.suggestUsers);
router.get("/getMentionUser", adminController.getMentionUser);

router.post("/addMention",adminController.addMention);

export default router;