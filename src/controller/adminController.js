import registerModel from "../model/registerModel.js";
import adminService from "../service/adminService.js";
const BASE_URL = process.env.BASE_URL || 'http://localhost:2007';


const adminController = {
    register: async (req, res, next) => {
        try {
            const register = await adminService.register(req.body);
            res.status(200).json({
                status: 200,
                msg: "successfully created",
                register
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }

    },
    // =================
    verifyEmail: async (req, res, next) => {
        const { email } = req.params;
        try {
            const verifyEmailResult = await adminService.verifyEmail(email);
            res.status(200).json({
                status: 200,
                msg: "OTP sent to email successfully",
                data: verifyEmailResult
            });
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },

    // ==========
    verifyOtp: async (req, res, next) => {
        try {
            const { email, enteredOtp } = req.body;

            if (!email || !enteredOtp) {
                const error = new Error("Email and OTP are required");
                error.statuscode = 400;
                error.errorType = "ValidationError";
                throw error;
            }

            if (!/^\d+$/.test(enteredOtp)) {
                const error = new Error("OTP must contain only numeric values");
                error.statuscode = 400;
                error.errorType = "ValidationError";
                throw error;
            }

            console.log(req.body);

            const verifyOtp = await adminService.verifingOtp(req.body);

            res.status(200).json({
                status: 200,
                msg: "OTP verified successfully",
                verifyOtp,
            });
        } catch (error) {
            error.error = error.message;
            console.error(error);
            const statusCode = error.statuscode || 500;

            // Add specific error type for OTP verification failure
            const errorType = error.errorType ||
                (statusCode === 400 ? "OtpVerificationError" : "ServerError");

            res.status(statusCode).json({
                status: statusCode,
                msg: error.message || "An unexpected error occurred",
                errorType: errorType,
            });
        }
    },

    // ==========
    registerUserWithBusiness: async (req, res, next) => {
        try {
            const register = await adminService.registerUserWithBusiness(req.body);
            res.status(200).json({
                status: 200,
                msg: "Successfully created",
                register,
            });
        } catch (error) {
            console.error(error);
            // Ensure error structure is consistent
            error.status = error.status || 400; // Default to 400 if no status set
            error.message = error.message || 'Something went wrong';

            // Pass the error to the next middleware
            next(error);
        }
    },



    // ==============================
    login: async (req, res, next) => {
        try {
            const loginResponse = await adminService.login(req.body);

            if (loginResponse.status === 400 || loginResponse.status === 500) {
                return res.status(loginResponse.status).json(loginResponse);
            }

            res.status(200).json({
                status: 200,
                msg: "Logged in successfully",
                login: loginResponse.login,
            })
        } catch (error) {
            next({
                statuscode: 400,
                error: error.message || "An unexpected error occurred",
            });
        }

    },

    // ===================================
    otpValidation: async (req, res, next) => {
        try {
            const otpValidation = await adminService.otpValidation(req.body);
            res.status(200).json({
                status: 200,
                otpValidation
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }

    },
    // ================
    updateRegister: async (req, res, next) => {
        try {
            const updateRegister = await adminService.updateRegister(req.body);

            res.status(200).json({
                status: 200,
                msg: "updated successfully",
                updateRegister
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }

    },

    // ==============================
    forgotPassword: async (req, res, next) => {
        try {
            const forgotPassword = await adminService.forgotPassword(req.body);
            res.status(200).json({
                status: 200,
                msg: "updated successfully",
                forgotPassword
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }

    },
    // ==================
    BusinessRegister: async (req, res, next) => {
        try {

            const BusinessRegister = await adminService.businessRegister(req.body);
            console.log(BusinessRegister, "Service Response");

            res.status(200).json({
                status: 200,
                msg: "Registered Successfully",
                BusinessRegister
            });
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },


    // ===================
    getPendingStatus: async (req, res, next) => {
        try {
            const getPendingStatus = await adminService.getPendingStatus();
            res.status(200).json({
                status: 200,
                msg: "successfully fetched",
                getPendingStatus
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }

    },
    // ===========================
    updateBusinessStatus: async (req, res, next) => {
        try {
            const updateBusinessStatus = await adminService.updateBusinessStatus(req.body);
            res.status(200).json({
                status: 200,
                msg: " updated successfully ",
                updateBusinessStatus
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }

    },

    // ==========================
    imgUpload: async (req, res) => {
        try {
            if (!req.files || Object.keys(req.files).length === 0) {
                return res.status(400).json({ message: 'No file uploaded!' });
            }

            const uploadedFiles = {};
            for (const [fieldName, files] of Object.entries(req.files)) {
                uploadedFiles[fieldName] = files.map(file => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`);
            }

            res.status(200).json({ uploadedFiles });
        } catch (error) {
            console.error('Error uploading images:', error);
            res.status(500).json({ message: 'An error occurred while uploading the images.' });
        }
    },


    fileUpload: async (req, res) => {
        try {
            console.log('file process');
            if (!req.file) {
                return res.status(400).json({ message: 'No file uploaded!' });
            }

            const uploadedFileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

            res.status(200).json({
                message: 'File uploaded successfully!',
                fileUrl: uploadedFileUrl,
                fileName: req.file.filename,
                fileType: req.file.mimetype,
                fileSize: req.file.size,
            });
        } catch (error) {
            console.error('Error uploading file:', error);
            res.status(500).json({ message: 'An error occurred while uploading the file.' });
        }
    },
    // ==================
    searchRecommendation: async (req, res) => {
        try {
            const { data } = req.params;

            if (!data) {
                return res.status(400).json({ message: "Data parameter is required" });
            }

            const search = await adminService.searchRecommendation(data);


            res.status(200).json({
                status: 200,
                msg: "Fetched successfully",
                search,
            });
        } catch (error) {
            return res.status(404).json({ status: 400, message: "No matching results found" });
        }
    },
    // ====================
    friendRequest: async (req, res,next) => {
        try {
            const friendRequest = await adminService.friendRequest(req.body);
            res.status(200).json({
                status:200,
                friendRequest})
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },
    // =====================
    createpost: async (req, res,next) => {
        try {
            const post = await adminService.createpost(req.body);
            res.status(200).json({
                status:200,
                post})
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },
    // ==================
    getPosts: async (req, res, next) => {
        const { id } = req.params;
        const page = parseInt(req.query.page, 10) || 1; 
        const limit = parseInt(req.query.limit, 10) || 25;
    
        try {
            const getPosts = await adminService.getPosts(id, page, limit);
    
            res.status(200).json({
                status: 200,
                data: getPosts,
            });
        } catch (error) {
            console.error("Error fetching posts:", error.message);
            error.statusCode = 400;
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },
// ==================
followUser: async (req, res) => {
    try {
      const { user_id, follower_id } = req.body;
      const follow = await adminService.followUser(user_id, follower_id);
      res.status(200).json({ message: 'User followed successfully', data: follow });
    } catch (error) {
      res.status(500).json({ message: 'Error following user', error: error.message });
    }
  },

  // =========================
  unfollowUser: async (req, res) => {
    try {
      const { user_id, follower_id } = req.body;
      await adminService.unfollowUser(user_id, follower_id);
      res.status(200).json({ message: 'User unfollowed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error unfollowing user', error: error.message });
    }
  },

  // ============================
  getFollowers: async (req, res) => {
    try {
      const { id } = req.params;
      const followers = await adminService.getFollowers(id);
      res.status(200).json({ message: 'Followers fetched successfully', data: followers });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching followers', error: error.message });
    }
  },

  //===========================
  getFollowing: async (req, res) => {
    try {
      const { id } = req.params;
      const following = await adminService.getFollowing(id);
      res.status(200).json({ message: 'Following fetched successfully', data: following });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching following', error: error.message });
    }
  },
    
//   ========================
AcceptRequest: async (req, res,next) => {
    try {
        const AcceptRequest = await adminService.AcceptRequest(req.body);
        res.status(200).json({
            status:200,
            AcceptRequest})
    } catch (error) {
        error.error = error.message;
        console.error(error);
        error.statuscode = 400;
        next(error);
    }
},
//   =========================
suggestUsers: async (req, res,next) => {
    const{id}=req.params;
    try {
        const suggestUsers = await adminService.suggestUsers(id);
        res.status(200).json({
            status:200,
            suggestUsers})
    } catch (error) {
        error.error = error.message;
        console.error(error);
        error.statuscode = 400;
        next(error);
    }
},



}


export default adminController;