import adminService from "../service/adminService.js";
const BASE_URL = process.env.BASE_URL || 'http://localhost:2007';


const adminController = {
    register: async (req, res, next) => {
        try {
            const register = await adminService.register(req.body);
            res.status(200).json({
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
    verifyEmail: async (req, res,next) => {
        const { email } = req.params;
        try {
            const verifyEmailResult = await adminService.verifyEmail(email);
            res.status(200).json({
                msg: "Email verification initiated successfully",
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
    verifyOtp: async (req, res,next) => {
        try {
            const verifyOtp = await adminService.verifingOtp(req.body);
            res.status(200).json({
                msg: " otp verified successfully ",
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
    login: async (req, res,next) => {
        try {
            const login = await adminService.login(req.body);
            res.status(200).json({
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
    otpValidation: async (req, res,next) => {
        try {
            const otpValidation = await adminService.otpValidation(req.body);
            res.status(200).json({
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
    updateRegister: async (req, res,next) => {
        try {
            const updateRegister = await adminService.updateRegister(req.body);

            res.status(200).json({
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
    forgotPassword: async (req, res,next) => {
        try {
            const forgotPassword = await adminService.forgotPassword(req.body);
            res.status(200).json({
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
    BusinessRegister: async (req, res,next) => {
        try {
            const BusinessRegister = await adminService.BusinessRegister(req.body);
            console.log(BusinessRegister, "kkjjh")
            res.status(200).json({
                msg: "Successfully created",
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
    getPendingStatus: async (req, res,next) => {
        try {
            const getPendingStatus = await adminService.getPendingStatus();
            res.status(200).json({
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
    updateBusinessStatus: async (req, res,next) => {
        try {
            const updateBusinessStatus = await adminService.updateBusinessStatus(req.body);
            res.status(200).json({
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