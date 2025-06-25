import express from "express";
import adminController from "../controller/adminController.js";
import multer from "multer";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid"; 
import registerModel from '../model/registerModel.js';
import businessRegisterModel from '../model/BusinessModel.js';
import "dotenv/config";

const router = express.Router();

// Multer Storage Configuration
const storage = multer.diskStorage({
 destination: (req, file, cb) => cb(null,  process.env.UPLOAD_FOLDER),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
  
});
// Media Multer Storage Configuration
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine destination folder based on file type
    const folder = file.mimetype.startsWith('image') ? 'images' : 'videos';
    console.log(folder);
    cb(null, `${process.env.UPLOAD_FOLDER}/${folder}`);
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
  storage: mediaStorage,
  // limits: { fileSize: 1024 * 1024 * 500 },
   // Fix here
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

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, process.env.UPLOAD_FOLDER);
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    },
  }),
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
router.get("/verifyName", adminController.verifyNameUnique);
router.get("/checkMobileNumber", adminController.checkMobileNumber);
router.post("/login", adminController.login);
router.get("/getMyAccounts", adminController.getMyAccounts);
router.post("/otpValidation", adminController.otpValidation);
router.put('/updateRegister', adminController.updateRegister);
router.post("/forgotPassword", adminController.forgotPassword);
router.post("/BusinessRegister", adminController.BusinessRegister);
router.post("/updateNotificationDetails", adminController.updateNotificationDetails);
router.post("/registerUserWithBusiness", adminController.registerUserWithBusiness);
router.post("/registerUserAccount", adminController.registerUserAccount);
router.post("/addAccessIdToBusinessAccount", adminController.addAccessIdToBusinessAccount);
router.post("/registerBusinessAccount", adminController.registerBusinessAccount);
router.post("/updateBusinessProfile", adminController.updateBusinessProfile);
router.post("/updateSomeBusinessDetails",adminController.updateSomeBusinessDetails);
router.get("/getProfile/:userId",adminController.getProfile);
        


router.post('/sendMessage', uploadFiles.single('filename'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const { filename, originalname, size } = req.file;

  res.status(200).json({
    success: true,
    fileName: originalname,
    post_url: `/socouploads/${filename}`, // This is what gets stored in DB
    fileSize: size,
  });
});


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


router.post(
    "/fileUploadByAccountType",
    uploadFiles.single('file'),
    async (req, res) => {
        try {
            const { accountType, id, fieldName } = req.body;
            console.log(accountType); 
            console.log(id); 
            console.log(fieldName); 

            if (!req.file) return res.status(422).json({ message: 'No file uploaded!' });
            if (!accountType || !id || !fieldName) return res.status(400).json({ message: 'Missing required parameters!' });
            if (!allowedAccountTypes.includes(accountType)) return res.status(400).json({ message: 'Invalid account type!' });
            // if (!allowedFields.includes(fieldName)) return res.status(400).json({ message: `Invalid field name: ${fieldName}` });
          const fileUrl = `${req.protocol}://${req.get('host')}/socouploads/${req.file.filename}`;

             console.log(id);      
            if (accountType === 'user') {
                const user = await registerModel.findById(id);
                if (!user) return res.status(404).json({ message: 'User not found!' });
                user[fieldName] = fileUrl;
                await user.save();
                return res.status(200).json({ message: 'File uploaded and user updated successfully!', fileUrl });
            }

            if (accountType === 'business') {
                const business = await businessRegisterModel.findById(id);
                console.log(business);
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
           const fileUrl = `${req.protocol}://${req.get('host')}/socouploads/${req.file.filename}`;

            res.status(200).json({ message: 'File uploaded successfully!', fileUrl });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);

//for multiple files    used
router.post(
  '/filesUpload',
  upload.any(),
  (req, res) => {
    console.log('Upload request received');

    if (!req.files || req.files.length === 0) {
      console.log('No files received');
      return res.status(400).json({ message: 'No files uploaded. Please select valid files.' });
    }

    const fileUrls = [];
    const uploadedFiles = new Set(); // To track duplicate files

    console.log('Total files received:', req.files.length);

    req.files.forEach((file, index) => {
      if (!file) {
        console.log(`Skipping invalid file at index ${index}`);
        return;
      }

      // Generate a unique name if the original filename is missing
      const fileKey = file.originalname
        ? file.originalname.trim()
        : `file_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      console.log(`Processing file ${index + 1}:`, fileKey);

      // Check for duplicates based on the filename
      if (uploadedFiles.has(fileKey)) {
        console.log(`Duplicate found: ${fileKey}`);
        return res.status(400).json({
          message: `Same image found: ${fileKey}. Please ensure all files are different.`,
        });
      }

      uploadedFiles.add(fileKey);
      console.log(`File added: ${fileKey}`);

    const fileUrl = `${req.protocol}://${req.get('host')}/socouploads/${file.filename}`;


      fileUrls.push(fileUrl);
      console.log(`File URL generated: ${fileUrl}`);
    });

    console.log('Returned URLs:', fileUrls);

    if (fileUrls.length > 0) {
      console.log('Files uploaded successfully');
      return res.status(200).json({ message: 'Files uploaded successfully!', urls: fileUrls });
    } else {
      console.log('No valid files were uploaded');
      return res.status(400).json({ message: 'No valid files were uploaded.' });
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
      console.log('--- Inside uploadMedia Route ---');
      console.log('Request received:', new Date().toISOString());

      const files = req.files;
      console.log('Files object initialized:', files);

      if (!files || (!files.image && !files.video)) {
        console.warn('No media files found in request.');
        return res.status(400).json({ message: 'No media files uploaded!' });
      }

      const response = {};

      if (files.image) {
        console.log(`Processing ${files.image.length} image(s)...`);
        response.images = files.image.map((file) => {
          console.log(`Image Uploaded - Original Name: ${file.originalname}, Saved Name: ${file.filename}`);
          return {
            fileName: file.originalname,
            filePath: `${req.protocol}://${req.get('host')}/${process.env.UPLOAD_FOLDER}/images/${encodeURIComponent(file.filename)}`,
          };
        });
      }

      if (files.video) {
        console.log(`Processing ${files.video.length} video(s)...`);
        response.videos = files.video.map((file) => {
          console.log(`Video Uploaded - Original Name: ${file.originalname}, Saved Name: ${file.filename}`);
          return {
            originalFileName: file.originalname,
            uniqueId: file.filename,
            filePath: `${req.protocol}://${req.get('host')}/${process.env.UPLOAD_FOLDER}/videos/${encodeURIComponent(file.filename)}`,
          };
        });
      }

      console.log('Media uploaded successfully:', response);

      return res.status(200).json({
        message: 'Media uploaded successfully!',
        media: response,
      });
    } catch (error) {
      console.error('Error in uploadMedia:', error);
      res.status(500).json({ message: 'Internal server error.', error: error.message });
    }
  }
);


// Social Features
router.get("/searchRecommendation", adminController.searchRecommendation);
router.post("/friendRequest", adminController.friendRequest);
router.post("/createPost", adminController.createPost);
router.post("/repostPost", adminController.repostPost);
router.post("/createPostByProduct", adminController.createPostByProduct);
router.get("/returnMySearchProduct", adminController.returnMySearchProduct);
router.post("/updateUserDetails/:id", adminController.updateUserDetails);
router.post("/addAndUpdateBio/:id", adminController.addAndUpdateBio);
router.get("/getPosts/:id", adminController.getPosts);
router.post("/getPostDetails", adminController.getPostDetails);
router.post("/getUserProfile", adminController.getUserProfile);
router.post("/fetchUserFriends", adminController.fetchUserFriends);
router.post("/fetchUserPosts", adminController.fetchUserPosts);
router.post("/followUser", adminController.followUser);
router.post("/unfollowUser", adminController.unfollowUser);
router.get("/getFollowers/:id", adminController.getFollowers);
router.get("/getTopFollowersById/:id", adminController.getTopFollowersById);
router.get("/getFollowing/:id", adminController.getFollowing);
router.put("/AcceptRequest", adminController.AcceptRequest);
router.get("/suggestUsers/:id", adminController.suggestUsers);
router.get("/getMentionUser", adminController.getMentionUser);
router.get("/getAllFollowing/:userId",adminController.getAllFollowing);
router.post("/addMention",adminController.addMention);

router.get("/getDynamicFollowers/:id",adminController.getDynamicFollowers);

router.get("/getDynamicFeed",adminController.getDynamicFeed)


router.post("/notifyuser",adminController.notifyuser);


router.post("/cart",adminController.cart);
router.put("/updateCart",adminController.updateCart)
router.delete("/removeFromCart",adminController.removeFromCart);

router.get("/getCart/:id",adminController.getCart);


// router.post("/sendMessage/:from/:to",adminController.sendMessage);


router.get("/getSinglePost/:post_id",adminController.getSinglePost)
router.get("/getChatHistory/:from/:to",adminController.getChatHistory);

router.delete("/deleteFromRedis",adminController.deleteFromRedis);

router.put("/updateMsg",adminController.updateMsg);
router.get("/getAllChatUser/:user_id",adminController.getAllChatUser)

router.get("/getFeed/:user_id/:address",adminController.getFeed)


router.post("/addDeliveryAddress",adminController.addDeliveryAddress);
router.get("/getDeliveryAddress/:user_id",adminController.getDeliveryAddress);

router.delete("/deleteAddress/:id",adminController.deleteAddress)

///  fav

router.post("/toggleFav",adminController.toggleFav);
router.post("/toggleBookmark",adminController.toggleBookmark);

router.get("/getUserFavorites",adminController.getUserFavorites );
router.get("/getUserBookmarks",adminController.getUserBookmarks );

router.put("/addInterest",adminController.addInterest);
router.get("/getInterst",adminController.getInterst);
router.get("/getCollection/:userId",adminController.getCollection);


router.post("/togglePin",adminController.togglePin);

export default router;