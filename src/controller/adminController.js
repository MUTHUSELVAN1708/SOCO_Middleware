import adminService from "../service/adminService.js";
const BASE_URL = process.env.BASE_URL || 'http://localhost:2007';
const adminController = {
    register: async (req, res) => {
        try {
            const register = await adminService.register(req.body);
            res.status(200).json({
                msg: "successfully created",
                register
            })
        } catch (error) {
            console.log(error);
            res.status(500).json(error)
        }

    },

    // ==============================
    login: async (req, res) => {
        try {
            const login = await adminService.login(req.body);
            res.status(200).json({
                login
            })
        } catch (error) {
            console.log(error);
            res.status(500).json(error)
        }

    },
    // ===================================
    otpValidation: async (req, res) => {
        try {
            const otpValidation = await adminService.otpValidation(req.body);
            res.status(200).json({
                otpValidation
            })
        } catch (error) {
            console.log(error);
            res.status(500).json(error)
        }

    },
    // ================
    updateRegister: async (req, res) => {
        try {
            const { user_id, addNew_Interest, interest } = req.body;

            const profile_img_url = req.file
                ? `${BASE_URL}/uploads/${req.file.filename}`
                : null;

            const updateRegister = await adminService.updateRegister({
                user_id,
                addNew_Interest,
                interest,
                profile_img: profile_img_url,
            });

            res.status(200).json({
                updateRegister
            })
        } catch (error) {
            console.log(error);
            res.status(500).json(error)
        }

    },

    // ==============================
    forgotPassword: async (req, res) => {
        try {
            const forgotPassword = await adminService.forgotPassword(req.body);
            res.status(200).json({
                msg:"updated successfully",
                forgotPassword
            })
        } catch (error) {
            console.log(error);
            res.status(500).json(error)
        }

    },
    // ==================
    BusinessRegister: async (req, res) => {
        try {
            console.log(req.files); 
    
            console.log(req.body);
            const brand_logos = req.files['brand_logo'] ? req.files['brand_logo'].map(file => `${BASE_URL}/uploads/${file.filename}`) : [];
            const cover_imgs = req.files['cover_img'] ? req.files['cover_img'].map(file => `${BASE_URL}/uploads/${file.filename}`) : [];
    
            const businessData = {
                brand_logos,
                cover_imgs,
              
            };
    
            const BusinessRegister = await adminService.BusinessRegister(businessData,req.body);
    
            res.status(200).json({
                msg: "Successfully created",
                BusinessRegister
            });
        } catch (error) {
            console.log(error);
            res.status(500).json(error);
        }
    },
    

    // ===================
    getPendingStatus: async (req, res) => {
        try {
            const getPendingStatus = await adminService.getPendingStatus();
            res.status(200).json({
                msg: "successfully fetched",
                getPendingStatus
            })
        } catch (error) {
            console.log(error);
            res.status(500).json(error)
        }

    },
    // ===========================
    updateBusinessStatus: async (req, res) => {
        try {
            const updateBusinessStatus = await adminService.updateBusinessStatus(req.body);
            res.status(200).json({
                msg: " updated successfully ",
                updateBusinessStatus
            })
        } catch (error) {
            console.log(error);
            res.status(500).json(error)
        }

    },


}


export default adminController;