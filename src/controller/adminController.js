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
            const verifyOtp = await adminService.verifingOtp(req.body);
            res.status(200).json({
                status: 200,
                msg: "OTP verified successfully ",
                verifyOtp
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
        }

    },

    // ==============================
    login: async (req, res, next) => {
        try {
            const login = await adminService.login(req.body);
            res.status(200).json({
                status: 200,
                msg: "Logged in successfully",
                login
            })
        } catch (error) {
            error.error = error.message;
            console.error(error);
            error.statuscode = 400;
            next(error);
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
            // console.log('Raw Data:', req.body);
            // console.log('Files:', req.files);
            const rawData = JSON.parse(req.body.data);
            // console.log(rawData);
            const brand_logo = req.files['brand_logo'] ? `${BASE_URL}/uploads/${req.files['brand_logo'][0].filename}` : ''; 
            const cover_img = req.files['cover_img'] ? `${BASE_URL}/uploads/${req.files['cover_img'][0].filename}` : '';
            const pan_img = req.files['pan_img'] ? `${BASE_URL}/uploads/${req.files['pan_img'][0].filename}` : '';  
            const aadhar_img = req.files['aadhar_img'] ? `${BASE_URL}/uploads/${req.files['aadhar_img'][0].filename}` : '';
            
            const businessData = {
                ...rawData, 
                brand_logo,
                cover_img,
                pan_img,
                aadhar_img
            };
    
            const BusinessRegister = await adminService.BusinessRegister(businessData);
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


}


export default adminController;