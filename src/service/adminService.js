import registerModel from "../model/registerModel.js";
import bcrypt from "bcrypt";
import otpGenerator from "otp-generator";
import twilio from "twilio";
import "dotenv/config";
import crypto from "crypto";
import jwt from "jsonwebtoken"
import locationModel from "../model/locationModel.js";
import businessregisterModel from "../model/BusinessModel.js";

const client = new twilio(process.env.AccountSID, process.env.AuthToken);
const SECRET_KEY = crypto.randomBytes(32).toString('hex');

const adminService = {
    register: async (data) => {
        const { full_Name, phn_number, email, DOB, password, status, address, isSameNumberBusiness, agree } = data;
        try {

            const phnNumber = await registerModel.findOne({ phn_number });
            if (phnNumber) {
                throw { msg: "phone number is already exist" }
            }
            const hashedpassword = await bcrypt.hash(password, 10)
            console.log(hashedpassword, "kk")
            const addresss = await locationModel.create({ address });
            const register = await registerModel.create({
                location_id: addresss._id,
                full_Name,
                phn_number,
                password: hashedpassword,
                email,
                status,

                DOB,
                isSameNumberBusiness,
                agree
            });

            return register
        } catch (error) {
            throw error;
        }
    },
    // ==================================
    login: async (data) => {
        const { full_Name, phn_number, password } = data;
        try {
            if (phn_number) {
                const user = await registerModel.findOne({ phn_number });
                if (!user) {
                    throw { msg: "user not found please register" }
                }
                const otp = otpGenerator.generate(4, {
                    digits: true,
                    specialChars: false,
                    lowerCaseAlphabets: false,
                    upperCaseAlphabets: false,
                });
                console.log(otp);
                await adminService.storeOtp(user._id, otp);
                await adminService.sendOtp(phn_number, otp);

                return {
                    message: "Authentication successful",
                    user_id: user._id,
                    // full_Name: user.full_Name,
                }
            } else {
                const login = await registerModel.findOne({ full_Name });
                if (!login) {
                    throw { err: "username not found" }
                }

                const isPasswordMatch = await bcrypt.compare(password, login.password);
                if (!isPasswordMatch) {
                    throw {
                        error: "Invalid password"
                    };
                }
                const token = jwt.sign({
                    user_id: login._id
                }, SECRET_KEY);
                return {
                    token, login
                };
            }
        } catch (error) {
            throw error;
        }
    },
    // ===================
    storeOtp: async (user_id, otp) => {

        try {
            if (!user_id) {
                throw new Error('Invalid user ID.');
            }
            if (!otp || typeof otp !== 'string') {
                throw new Error('Invalid OTP format. Must be a string.');
            }

            const hashedOtp = await bcrypt.hash(otp, 10);
            console.log('Hashed OTP:', hashedOtp);

            const updatedUser = await registerModel.findOneAndUpdate(
                { _id: user_id },
                { $set: { otp: hashedOtp } },
                { new: true }
            );

            console.log('Updated User:', updatedUser);
            if (!updatedUser) {
                throw new Error('User not found.');
            }
            return updatedUser
        } catch (error) {
            console.error('Error in storeOtp:', error);
            throw new Error("Error storing OTP.");
        }
    },


    //   =====================
    sanitizePhoneNumber: (phoneNumber, countryCode) => {
        if (!phoneNumber.startsWith('+')) {
            return `+${countryCode}${phoneNumber}`;
        }
        return phoneNumber;
    },

    validatePhoneNumber: (phoneNumber) => {
        const regex = /^\+[1-9]\d{1,14}$/;
        return regex.test(phoneNumber);
    },

    sendOtp: async (phoneNumber, otp) => {
        try {
            const sanitizedPhoneNumber = adminService.sanitizePhoneNumber(phoneNumber, countryCode);
            if (!adminService.validatePhoneNumber(sanitizedPhoneNumber)) {
                throw new Error("Invalid phone number format.");
            }

            const message = `Your OTP is: ${otp}`;
            const response = await client.messages.create({
                body: message,
                to: sanitizedPhoneNumber,
                from: "",
            });

            console.log('OTP sent successfully:', response.sid);
        } catch (error) {
            if (error.code === 30447) {
                console.error('Invalid "From" number. Please use a valid Twilio number.');
                throw new Error("Invalid 'From' number for Twilio.");
            }

            console.error('Error sending OTP via Twilio:', error);
            throw new Error("Error sending OTP via Twilio.");
        }
    },


    // =================
    otpValidation: async (data) => {
        const { user_id, otp } = data;

        try {
            const user = await registerModel.findById(user_id);

            if (!user) {
                throw { error: "User not found." };
            }
            const isOtpValid = await adminService.verifyOtp(user_id, otp);
            if (!isOtpValid) {
                throw { error: "Invalid OTP." };
            }
            const token = jwt.sign({ user_id }, SECRET_KEY);

            return { token, user_id };
        } catch (error) {
            throw error;
        }
    },


    // ====================
    verifyOtp: async (user_id, otp) => {
        try {
            const storedOtpEntry = await registerModel.findById(user_id);
            if (!storedOtpEntry) {
                return false;
            }
            const isOtpValid = await bcrypt.compare(otp, storedOtpEntry.otp);

            return isOtpValid;

        } catch (error) {
            throw error
        }
    },
    // ==================
    updateRegister: async (data) => {
        const { user_id, addNew_Interest, interest, profile_img } = data
        try {
            const update = await registerModel.findByIdAndUpdate(user_id, {
                profile_img, addNew_Interest, interest

            },
                { new: true })
            return update
        } catch (error) {
            throw error
        }
    },

    // =======================

    forgotPassword: async (data) => {
        const { email, password } = data;

        console.log(data, "data");

        if (!email || !password) {
            throw new Error("email and password are required.");
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);

            const update = await registerModel.findOneAndUpdate(
                { email },
                { password: hashedPassword },
                { new: true }
            );

            if (!update) {
                throw { err: "User not found or update failed." };
            }

            return {password:update.password};
        } catch (error) {
            console.error("Error in forgotPassword:", error);
            throw error;
        }
    },
    // ====================
    BusinessRegister: async (businessData,data) => {
        const { isSameNumberBusiness, Brand_Name, org_name, PAN_NO, GST_NO, status, Name, address, location_id, brand_logo, cover_img, agree, type_of_service, category, sub_category, } = data;
        
        console.log(data,"data")
        try {

            const business = await registerModel.findOne({ isSameNumberBusiness });
            if (business.isSameNumberBusiness == true) {
                const addresss = await locationModel.create({ address });
                const register = await businessregisterModel.create({
                    location_id: addresss._id,
                    Brand_Name, org_name, PAN_NO, GST_NO, Name, status,
                    brand_logo, cover_img, agree, type_of_service, category, sub_category,
                });

                return register
            }

        } catch (error) {
            throw error;
        }
    },
    // ========================
    getPendingStatus: async () => {
        try {
            const getStatus = await businessregisterModel.find({ status: "Pending" });
            return getStatus
        } catch (error) {
            throw error
        }
    },
    // =========================
    updateBusinessStatus: async (data) => {
        console.log(data)
        try {
            const updateBusinessStatus = await businessregisterModel.findOneAndUpdate({ _id:data.business_id} , 
                { status:data.status }, 
                { new: true }
            );
            return updateBusinessStatus
        } catch (error) {
            throw error
        }
    },
}



export default adminService;