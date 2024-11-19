import adminService from "../service/adminService.js";

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
otpValidation:async (req, res) => {
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
    updateRegister:async (req, res) => {
        try {
            const updateRegister = await adminService.updateRegister(req.body);
            res.status(200).json({
                updateRegister
            })
        } catch (error) {
            console.log(error);
            res.status(500).json(error)
        }

    },
}


export default adminController;