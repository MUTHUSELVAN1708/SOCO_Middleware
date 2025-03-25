import registerModel from "../model/registerModel.js";
import adminService from "../service/adminService.js";
// import redisService from "../service/redisService.js";
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

    verifyNameUnique: async (req, res, next) => {
        try {
            let { full_Name } = req.query; // Use req.query instead of req.params

            if (!full_Name || typeof full_Name !== 'string' || !full_Name.trim()) {
                throw new Error('Invalid name format. Must be a non-empty string.');
            }

            full_Name = full_Name.trim(); // Trim spaces

            const existingUser = await registerModel.findOne({ full_Name });

            res.status(200).json({ isUnique: !existingUser }); // Returns true if unique, false otherwise
        } catch (error) {
            console.error('Error in verifyNameUnique:', error);
            next({ statuscode: 400, error: error.message });
        }
    },

    // ==========
    verifyOtp: async (req, res, next) => {
        try {
            const { email, enteredOtp } = req.body;

            if (!email || !enteredOtp) {
                const error = new Error("Email and OTP are required");
                error.statusCode = 400;
                error.errorType = "ValidationError";
                throw error;
            }

            if (!/^\d+$/.test(enteredOtp)) {
                const error = new Error("OTP must contain only numeric values");
                error.statusCode = 400;
                error.errorType = "ValidationError";
                throw error;
            }

            console.log(req.body);

            const verifyOtp = await adminService.verifingOtp(req.body);

            if (!verifyOtp.success) {
                return res.status(400).json({
                    status: 400,
                    msg: verifyOtp.message || "Invalid OTP entered",
                    errorType: "OtpVerificationError",
                });
            }

            res.status(200).json({
                status: 200,
                verifyOtp,
            });
        } catch (error) {
            error.error = error.message;
            console.error(error);
            const statusCode = error.statusCode || 500;

            res.status(statusCode).json({
                status: statusCode,
                msg: error.message || "An unexpected error occurred",
                errorType: error.errorType || "ServerError",
            });
        }
    },

    // ==========
    updateNotificationDetails: async (req, res, next) => {
        try {
            const register = await adminService.updateNotificationDetails(req.body);
            res.status(200).json({
                status: 200,
                msg: "Successfully created",
                // data: register,
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
    registerUserWithBusiness: async (req, res, next) => {
        try {
            const register = await adminService.registerUserWithBusiness(req.body);
            res.status(200).json({
                status: 200,
                msg: "Successfully created",
                data: register,
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

    registerUserAccount: async (req, res, next) => {
        try {
            const register = await adminService.registerUserAccount(req.body);
            res.status(200).json({
                status: 200,
                msg: "Successfully created",
                data: register,
            });
            console.error(error);
        } catch (error) {
            // Ensure error structure is consistent
            error.status = error.status || 400; // Default to 400 if no status set
            error.message = error.message || 'Something went wrong';

            // Pass the error to the next middleware
            next(error);
        }
    },

    registerBusinessAccount: async (req, res, next) => {
        try {
            const register = await adminService.registerBusinessAccount(req.body);
            res.status(200).json({
                status: 200,
                msg: "Successfully created",
                data: register,
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

    updateBusinessProfile: async (req, res, next) => {
        try {
            const register = await adminService.updateBusinessProfile(req.body);
            res.status(200).json({
                status: 200,
                msg: "Successfully created",
                data: register,
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
                data: loginResponse.login,
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
                msg: "Password updated successfully. Please log in with the updated password.",
                forgotPassword
            });
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
    searchRecommendation: async (req, res, next) => {
        try {
            // const {query,typeOfSearch}=req.params;
            const query = req.query.query.trim();
            const typeOfSearch = req.query.typeOfSearch.trim();
            const page = 1;
            const limit = 25;

            if (!query) {
                return res.status(400).json({ message: "Query parameter is required" });
            }

            const search = await adminService.searchRecommendation(query, typeOfSearch || "Name", parseInt(page) || 1, parseInt(limit) || 25);

            if (!search.success) {
                return res.status(404).json({
                    status: 404,
                    message: search.message || "No matching results found",
                });
            }

            return res.status(200).json({
                status: 200,
                message: "Fetched successfully",
                data: search.data,
                pagination: search.pagination,
            });
        } catch (error) {
            error.statusCode = 400;
            error.error = error.message;
            error.statuscode = 400;
            next(error);
        }
    },

    // ====================
    friendRequest: async (req, res, next) => {
        try {
            const friendRequest = await adminService.friendRequest(req.body);
            res.status(200).json({
                status: 200,
                friendRequest
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },
    // =====================
    createpost: async (req, res, next) => {
        try {
            console.log("Received request to create post:", req.body);

            // Pass the request body to the service for processing
            const post = await adminService.createPost(req.body);

            // Respond with the status and created post
            res.status(200).json({
                status: 200,
                post
            });
        } catch (error) {
            console.error("Error creating post:", error.message);
            error.statuscode = 400;  // Set a status code for error
            next(error);  // Pass error to the next middleware for centralized error handling
        }
    },
    // ==================
    updateUserDetails: async (req, res, next) => {

        try {
            const getPosts = await adminService.updateUserDetails(req.body);

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

    addAndUpdateBio: async (req, res, next) => {

        try {
            const getPosts = await adminService.addAndUpdateBio(req.body);

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
    getMentionUser: async (req, res, next) => {
        const query = req.query.query.trim();

        try {
            const getPosts = await adminService.getMentionUser(query);

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
    getPosts: async (req, res, next) => {
        const { id } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 5;

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

    getPostDetails: async (req, res, next) => {
        const postId = req.body.postId;
        const isBusinessAccount = req.body.isBusiness;
        console.log("Received postId:", postId);
        console.log("Received isBusinessAccount:", isBusinessAccount);


        try {
            const getPostsDetails = await adminService.getPostDetails(postId, isBusinessAccount);

            res.status(200).json({
                status: 200,
                data: getPostsDetails,
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

    getUserProfile: async (req, res, next) => {
        const id = req.body.id;
        const isBusinessAccount = req.body.isBusiness;
        const userId = req.body.userId;
        const accountBusinessType = req.body.accountBusinessType;



        try {
            const getUserDetails = await adminService.getUserProfile(id, isBusinessAccount, userId, accountBusinessType);

            res.status(200).json({
                status: 200,
                data: getUserDetails,
            });
        } catch (error) {
            console.error("Error fetching Users:", error.message);
            error.statusCode = 400;
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },

    fetchUserFriends: async (req, res, next) => {
        const id = req.body.id;

        try {
            const getUserDetails = await adminService.fetchUserFriends(id);

            res.status(200).json({
                status: 200,
                data: getUserDetails,
            });
        } catch (error) {
            console.error("Error fetching Users Friend:", error.message);
            error.statusCode = 400;
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },

    fetchUserPosts: async (req, res, next) => {
        const id = req.body.id;
        const limit = req.body.limit;
        const page = req.body.page;

        try {
            const getUserDetails = await adminService.fetchUserPosts(id, page, limit);

            res.status(200).json({
                status: 200,
                data: getUserDetails,
            });
        } catch (error) {
            console.error("Error fetching Users posts :", error.message);
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
    getTopFollowersById: async (req, res) => {
        try {
            const { id } = req.params;
            const followers = await adminService.getTopFollowersById(id);
            res.status(200).json({ message: 'Followers fetched successfully', data: followers });
        } catch (error) {
            res.status(500).json({ message: 'Error fetching followers', error: error.message });
        }
    },

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
    AcceptRequest: async (req, res, next) => {
        try {
            const AcceptRequest = await adminService.AcceptRequest(req.body);
            res.status(200).json({
                status: 200,
                AcceptRequest
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },
    //   =========================
    suggestUsers: async (req, res, next) => {
        const { id } = req.params;
        try {
            const suggestUsers = await adminService.suggestUsers(id);
            res.status(200).json({
                status: 200,
                suggestUsers
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },
    // ===============
    addMention: async (req, res, next) => {

        try {
            const addMention = await adminService.addMention(req.body);
            res.status(200).json({
                status: 200,
                addMention
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },

    // ======================
    getDynamicFollowers: async (req, res, next) => {
        const { id } = req.params;
        try {
            const getDynamicFollowers = await adminService.getDynamicFollowers(id);
            res.status(200).json({
                status: 200,
                getDynamicFollowers
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },

    // =================
    getDynamicFeed: async (req, res, next) => {
        const user_id = req.query.user_id;

        const visibility = req.query.visibility; // Extract visibility filter
        const tags = req.query.tags ? req.query.tags.split(",") : []; // Parse tags as an array
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
        const page = parseInt(req.query.page) || 1; // Default to 1
        const limit = parseInt(req.query.limit) || 10; // Default to 10



        try {
            const getDynamicFeed = await adminService.getDynamicFeed(user_id, visibility, tags, startDate, endDate, page, limit);
            res.status(200).json({
                status: 200,
                getDynamicFeed
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },
    // =========================
    createProduct: async (req, res, next) => {
        try {
            const createProduct = await adminService.createProduct(req.body);
            res.status(200).json({
                status: 200,
                createProduct
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },
    // ===============
    getproduct: async (req, res, next) => {
        try {
            const getproduct = await adminService.getproduct();
            res.status(200).json({
                status: 200,
                getproduct
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },

    // =======================
    updateProduct: async (req, res, next) => {
        try {
            const updateProduct = await adminService.updateProduct(req.body);
            res.status(200).json({
                status: 200,
                updateProduct
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },

    // ================
    deleteProduct: async (req, res, next) => {

        try {
            const deleteProduct = await adminService.deleteProduct(req.body);
            res.status(200).json({
                status: 200,
                deleteProduct
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },

    // ===============
    notifyuser: async (req, res) => {
        const { user_id, message, } = req.body;
        console.log(req.body, "req.body")
        try {
            if (!message || !user_id) {
                return res.status(400).json({
                    success: false,
                    message: "Message  are required!",
                });
            }

            const response = await adminService.notifyUser(req.body);
            res.status(200).json({
                success: true,
                message: "Notification sent successfully!",
                data: response,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to send notification",
                error: error.message,
            });
        }
    },

    // ====
    cart: async (req, res, next) => {
        try {
            const cart = await adminService.cart(req.body);
            res.status(200).json({
                status: 200,
                cart
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },

    // =================
    updateCart: async (req, res, next) => {
        try {
            const updateCart = await adminService.updateCart(req.body);
            res.json(updateCart);
        } catch (error) {
            error.message = error.error;
            // console.log(error);
            error.statuscode = 500;
            next(error);
        }
    },
    // =======================
    removeFromCart: async (req, res, next) => {
        try {
            const removeFromCart = await adminService.removeFromCart(req.body);
            res.status(200).json({
                status: 200,
                removeFromCart
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },
    // ================================
    getCart: async (req, res, next) => {
        try {
            const { id } = req.params;
            const getCart = await adminService.getCart(id);
            res.status(200).json({
                status: 200,
                getCart
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }
    },
    // =======================
    sendMessage: async (req, res) => {
        const { from, to } = req.params
        const { message } = req.body;
        console.log(from, to, message, "req.body")

        if (!from || !to || !message) {
            return res.status(400).json({ error: 'Missing required fields: from, to, or message' });
        }

        try {
            const response = await adminService.sendMessage(from, to, message);
            res.status(200).json(response);
        } catch (err) {
            console.error('Error in sendMessage:', err);
            res.status(500).json({ error: 'Error sending message' });
        }
    },

    getChatHistory: async (req, res) => {
        const { from, to } = req.params;

        try {
            const messages = await adminService.getChatHistory(from, to);
            res.status(200).json({ messages });
        } catch (err) {
            console.error('Error in getChatHistory:', err);
            res.status(500).json({ error: 'Error fetching chat history' });
        }
    },
    //   ======================================
    deleteFromRedis: async (req, res) => {
        const { chatKey, messagesToDelete } = req.body;
        console.log(req.body, "ki")

        if (!chatKey || !messagesToDelete || !Array.isArray(messagesToDelete)) {
            return res.status(400).json({ error: 'chatKey must be provided and messagesToDelete must be an array' });
        }

        try {

            const deleteResults = [];

            for (const messageToDelete of messagesToDelete) {
                const result = await redisService.deleteFromRedis(chatKey, messageToDelete);
                deleteResults.push(result);
            }

            res.status(200).json({ success: true, deletedMessages: deleteResults });
        } catch (err) {
            console.error('Error in deleteFromRedis:', err);
            res.status(500).json({ error: 'Error deleting messages' });
        }
    },

    //  =================================
    updateMsg: async (req, res) => {
        const { chatKey, oldMessage, newMessage } = req.body;

        if (!chatKey || !oldMessage || !newMessage) {
            return res.status(400).json({ error: 'chatKey, oldMessage, and newMessage are required' });
        }

        try {
            const updateResult = await redisService.updateMessage(chatKey, oldMessage, newMessage);
            res.status(200).json(updateResult);

        } catch (err) {
            console.error('Error in updateMessage:', err);
            res.status(500).json({ error: 'Error updating message' });
        }
    },

    //   =======================
    getFeed: async (req, res) => {
        const { user_id, address } = req.params;

        if (!user_id) {
            return res.status(400).json({ error: 'user are required' });
        }

        try {
            const getFeed = await adminService.getFeed(req.params);
            res.status(200).json(getFeed);

        } catch (err) {
            console.error('Error in getFeed:', err);
            res.status(500).json({ error: 'Error getFeed message' });
        }
    },

    //   ========================
    addDeliveryAddress: async (req, res) => {

        try {
            const addDeliveryAddress = await adminService.addDeliveryAddress(req.body);
            res.status(200).json(addDeliveryAddress);

        } catch (err) {
            console.error('Error in addDeliveryAddress:', err);
            res.status(500).json({ error: err.message });
        }
    },
    //   =====================
    getDeliveryAddress: async (req, res) => {
        const { user_id } = req.params
        try {
            const getDeliveryAddress = await adminService.getDeliveryAddress(req.params);
            res.status(200).json(getDeliveryAddress);

        } catch (err) {
            console.error('Error in getDeliveryAddress:', err);
            res.status(500).json({ error: err.message });
        }
    },
    //   ================
    deleteAddress: async (req, res) => {
        const { id } = req.params
        try {
            const deleteAddress = await adminService.deleteAddress(req.params);
            res.status(200).json({ msg: deleteAddress });

        } catch (err) {
            console.error('Error in deleteAddress:', err);
            res.status(500).json({ error: err.message });
        }
    },

    //    ================================
    payment: async (req, res, next) => {
        try {
            const paymentResult = await adminService.payment(req.body);
            res.status(200).json(paymentResult);
        } catch (error) {
            console.error("Error in payment processing:", error.message);
            next({
                message: error.message || "Internal Server Error",
                statusCode: error.statusCode || 500,
            });
        }
    },
    //   ====================
    checkout: async (req, res, next) => {

        try {
            const checkout = await adminService.checkout(req.body);
            console.log(checkout, "pppppppppppppp")
            const invoice = await adminService.Invoice(checkout);
            res.status(200).json(checkout);

        } catch (error) {
            error.message = error.error;
            console.log(error);
            error.statuscode = 500;
            next(error);
        }
    },
    // =========================\
    wishlist: async (req, res, next) => {
        try {
            const wishlist = await adminService.wishlist(req.body);
            console.log(wishlist, "wishlist");

            res.status(200).json(wishlist);
        } catch (error) {
            error.message = error.error;
            console.log(error);
            error.statuscode = 500;
            next(error);
        }
    },


    toggleBookmark: async (req, res, next) => {
        try {
            const response = await adminService.toggleBookmark(req.body);

            res.status(200).json({
                success: true,
                message: response.message,
                bookmarked: response.bookmarked,
            });

        } catch (error) {
            console.error("Error in toggleBookmark:", error);
            next({
                statusCode: 500,
                message: error.message || "Something went wrong while processing your request.",
            });
        }
    },

    toggleFav: async (req, res, next) => {
        try {
            const response = await adminService.toggleFav(req.body);
            console.log(response, "toggleFavorite");

            res.status(200).json({
                success: true,
                message: response.message,
                liked: response.liked,
                data: response.data || null,
            });

        } catch (error) {
            console.error("Error in toggleLike:", error);
            next({
                statusCode: 500,
                message: error.message || "Something went wrong while processing your request.",
            });
        }
    },

    getUserFavorites: async (req, res, next) => {
        try {
            const { user_id, page, limit } = req.query; // Use req.query for query parameters
            console.log(req.query);

            if (!user_id || !page) {
                return res.status(400).json({ message: "Missing required parameters" });
            }

            const response = await adminService.getUserFavorites(user_id, page, limit);
            res.status(200).json(response);
        } catch (error) {
            next({ statusCode: 500, message: error.message });
        }
    },

    getUserBookmarks: async (req, res, next) => {
        try {
            const { user_id, page, limit } = req.query;
            const response = await adminService.getUserBookmarks(user_id, page, limit);

            res.status(200).json(response);
        } catch (error) {
            next({ statusCode: 500, message: error.message });
        }
    },

    // ====================
    deleteWishlist: async (req, res, next) => {
        try {
            const deleteWishlist = await adminService.deleteWishlist(req.body);
            console.log(deleteWishlist, "deleteWishlist");

            res.status(200).json({ message: "Product removed from favorites" });
        } catch (error) {
            error.message = error.error;
            console.log(error);
            error.statuscode = 500;
            next(error);
        }
    },

    // =:=========================
    getWishlist: async (req, res, next) => {
        const { id } = req.params;
        try {
            const wishlist = await adminService.getWishlist(req.params);
            console.log(wishlist, "wishlist");

            res.status(200).json({ message: "Product fetched from favorites", wishlist });
        } catch (error) {
            console.log(error);
            error.statuscode = 500;
            next(error);
        }
    },

    // =====================
    getOrderHistory: async (req, res, next) => {
        try {
            const { user_id } = req.params;

            const orderHistory = await adminService.getOrderHistory(user_id);

            res.status(200).json({
                status: 200,
                orderHistory
            });
        } catch (error) {
            console.error("Error fetching order history:", error.message);
            next({
                statuscode: 400,
                message: error.message || "Error fetching order history",
            });
        }
    },
    // ======================
    updateOrderStatus: async (req, res) => {
        try {
            const { checkout_id } = req.params;
            const { newStatus } = req.body;

            const updatedOrder = await adminService.updateOrderStatus(checkout_id, newStatus);

            res.status(200).json({
                status: 200,
                message: "Order status updated successfully",
                updatedOrder
            });
        } catch (error) {
            throw new Error("Error updating order status");
        }
    },
    // =============================
    getAllUser: async (req, res) => {
        const { user_id } = req.body
        console.log(user_id,"ppp")
        try {
            const getuser = await adminService.getAllUser(user_id);
            res.status(200).json({
                status: 200,
                message: "get user successfully",
                getuser
            });
        } catch (error) {

        }
    },

}


export default adminController;