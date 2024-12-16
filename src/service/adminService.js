import registerModel from "../model/registerModel.js";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import otpGenerator from "otp-generator";
import twilio from "twilio";
import "dotenv/config";
import crypto from "crypto";
import jwt from "jsonwebtoken"
import locationModel from "../model/locationModel.js";
import businessregisterModel from "../model/BusinessModel.js";
import otpModel from "../model/regOtpModel.js";
import { constants } from "buffer";
import followerModel from "../model/followerModel.js";
import postModel from "../model/postModel.js";
import createPostModel from "../model/createPostModel.js";
import levenshtein  from "fast-levenshtein";
import mongoose from "mongoose";

import cron from "node-cron";
import mentionModel from "../model/mentionModel.js";
const client = new twilio(process.env.AccountSID, process.env.AuthToken);
const SECRET_KEY = crypto.randomBytes(32).toString('hex');
import  connectedUsers  from "../../socket.js"; 
const adminService = {
    register: async (data) => {
        const { full_Name, phn_number, email, DOB, reg_otp_id, password, status, address, isSameNumberBusiness, agree } = data;
        try {
            const phnNumber = await registerModel.findOne({ phn_number });
            if (phnNumber) {
                const phnNumber = await registerModel.findOne({ phn_number });
                if (phnNumber) {
                    const error = new Error("phone number is already exist");
                    error.status = 400; // Adding status 400 to the error
                    throw error;
                }

                const hashedpassword = await bcrypt.hash(password, 10);

                const addresss = await locationModel.create({ address });
                const register = await registerModel.create({
                    location_id: addresss._id,
                    full_Name,
                    phn_number,
                    password: hashedpassword,
                    email,
                    status,
                    reg_otp_id,
                    DOB,
                    isSameNumberBusiness,
                    agree
                });

                return register
            }
        } catch (error) {
            if (!error.status) {
                error.status = 500; // Default to internal server error if no status
            }
            throw error;
        }
    },

    // ==================
    verifyEmail: async (email) => {
        try {
            const existingEmail = await registerModel.findOne({ email });
            if (existingEmail) {
                throw new Error("Email already exists");
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error("Invalid email format");
            }

            const otp = otpGenerator.generate(4, {
                digits: true,
                specialChars: false,
                lowerCaseAlphabets: false,
                upperCaseAlphabets: false,
            });

            const emailSent = await adminService.SendOTPEmail(email, otp);
            const existingOtpRecord = await otpModel.findOne({ email });
            if (existingOtpRecord) {
                const hashedOtp = await bcrypt.hash(otp, 10);
                existingOtpRecord.reg_otp = hashedOtp;
                await existingOtpRecord.save();
                return existingOtpRecord;
            } else {
                const hashedOtp = await bcrypt.hash(otp, 10);
                const otpRecord = await otpModel.create({
                    email,
                    reg_otp: hashedOtp,
                });

                return otpRecord
            }

        } catch (error) {
            console.error("Error in verifyEmail service:", error);
            throw new Error(error.message || "Failed to verify email");
        }
    },

    // ====================
    storedOtp: async (user_id, reg_otp) => {

        try {
            if (!user_id) {
                throw new Error('Invalid user ID.');
            }
            if (!reg_otp || typeof reg_otp !== 'string') {
                throw new Error('Invalid OTP format. Must be a string.');
            }

            const hashedOtp = await bcrypt.hash(reg_otp, 10);

            const updatedUser = await registerModel.findOneAndUpdate(
                { _id: user_id },
                { $set: { reg_otp: hashedOtp } },
                { new: true }
            );

            if (!updatedUser) {
                throw new Error('User not found.');
            }
            return updatedUser
        } catch (error) {
            console.error('Error in storeOtp:', error);
            throw new Error("Error storing OTP.");
        }
    },

    // ================
    SendOTPEmail: async (receiverMail, otp) => {
        try {
            const transporter = nodemailer.createTransport({
                host: "smtp.gmail.com",
                port: 465,
                secure: true,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
                tls: {
                    rejectUnauthorized: false,
                },
            });
    
            const mailOptions = {
                from: "soco.infobusiness@gmail.com",
                to: receiverMail,
                subject: "Soco Verification Code",
                text: `Hello,
    
    Thank you for joining Soco, your hub for connecting with professionals and growing your business network.
    
    Your One-Time Password (OTP) is: ${otp}
    
    Use this code to verify your email and unlock access to the platform's features. For your security, please do not share this code with anyone.
    
    This OTP is valid for 10 minutes. If you did not request this code, please ignore this email or contact our support team at support@soco.com.
    
    Welcome to Soco! Let's build connections and create opportunities together.
    
    Best regards,  
    The Soco Team`
            };
    
            const info = await transporter.sendMail(mailOptions);
            return info.response;
        } catch (error) {
            console.error("Error in sending OTP Email:", error);
            throw new Error("Error in sending OTP Email");
        }
    },
    

    //   ==========
    verifingOtp: async (data) => {
        const { email, enteredOtp } = data;
        try {
            const storedOtpEntry = await otpModel.findOne({ email });

            if (!storedOtpEntry) {
                return {
                    success: false,
                    message: "No OTP entry found for the provided email",
                };
            }

            const isOtpValid = await bcrypt.compare(enteredOtp, storedOtpEntry.reg_otp);

            if (!isOtpValid) {
                return {
                    success: false,
                    message: "Invalid OTP entered",
                };
            }

            return {
                success: true,
                message: "OTP verified successfully",
            };
        } catch (error) {
            return {
                success: false,
                message: "An error occurred during OTP verification",
                error: error.message,
            };
        }
    },


    //   ==========
    registerUserWithBusiness: async (data) => {
        try {
            const {
                full_Name,
                phn_number,
                email,
                DOB,
                location_id,
                reg_otp_id,
                password,
                profile_url,
                status,
                address,
                isSameNumberBusiness,
                agree,
                businessType,
                natureOfBusiness,
                org_name,
                businessName,
                Brand_Name,
                ownerName,
                businessAddress,
                busCity,
                busState,
                busPinCode,
                busEmail,
                busPhone,
                PAN_NO,
                aadharNo,
                accountIsPublic,
                aadhar_img,
                pan_img,
                GST_NO,
                brand_logo,
                cover_img,
                type_of_service,
                category,
                sub_category,
                businessAgree,
                postCount = 0,
                followerCount = 0,
                followingCount = 0,
                needPermissionForFollowing = false,
                school = "",
                educationLevel = "",
                working = "",
                important = false,
                // Chat-related fields
                onlineStatus = false,
                isTyping = false,
                lastOnline = null,
                currentChatRoom = null,
                unreadMessagesCount = 0,
                bio, 
                title, 
                skills, 
                hobbies, 
                education, 
                degree, 
                field, 
                institution, 
                year, 
                grade, 
                achievements
            } = data;
    
            // Validate required fields
            let errors = [];
            if (!full_Name) errors.push("Full name is required.");
            if (!phn_number) errors.push("Phone number is required.");
            if (!email) errors.push("Email is required.");
            if (!password) errors.push("Password is required.");
            if (!address) errors.push("Address is required.");
            if (!agree) errors.push("Agreement is required.");
    
            if (errors.length > 0) {
                throw { status: 400, message: errors.join(" ") };
            }
    
            // Check for existing users and business name
            const existingUser = await Promise.all([
                registerModel.findOne({ full_Name }),
                registerModel.findOne({ phn_number }),
                registerModel.findOne({ email }),
                businessregisterModel.findOne({ businessName }), // Check for existing businessName
            ]);
    
            if (existingUser[0]) errors.push("Name already exists. Name must be unique.");
            if (existingUser[1]) errors.push("Phone number already exists. Try a different one or log in.");
            if (existingUser[2]) errors.push("Email already exists. Try a different one or log in.");
            if (existingUser[3]) errors.push("Business name already exists. Business name must be unique.");
    
            if (errors.length > 0) {
                throw { status: 400, message: errors.join(" ") };
            }
    
            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);
    
            // Create user entry
            const register = await registerModel.create({
                location_id,
                full_Name,
                phn_number,
                password: hashedPassword,
                email,
                profile_url: profile_url || "",
                status,
                accountIsPublic,
                reg_otp_id,
                DOB,
                isSameNumberBusiness,
                agree,
                postCount,
                followerCount,
                followingCount,
                needPermissionForFollowing,
                school,
                educationLevel,
                working,
                onlineStatus,
                isTyping,
                lastOnline,
                currentChatRoom,
                unreadMessagesCount,
                bio, 
                title, 
                skills, 
                hobbies, 
                education, 
                degree, 
                field, 
                institution, 
                year, 
                grade, 
                achievements,
            });
        
            // Create the address
            const addressEntry = await locationModel.create({
                user_id: register._id,
                address,
            });
        
            // Update user with address ID
            const updatedUser = await registerModel.findByIdAndUpdate(
                register._id,
                { location_id: addressEntry._id },
                { new: true }
            );
        
            // Create business entry
            const business = await businessregisterModel.create({
                user_id: register._id,
                Brand_Name: Brand_Name || "",
                org_name: org_name || "",
                PAN_NO: PAN_NO || "",
                aadharNo: aadharNo || "",
                GST_NO: GST_NO || "",
                Name: register.full_Name,
                status: "Inactive",
                aadhar_img: aadhar_img || "",
                pan_img: pan_img || "",
                brand_logo: brand_logo || "",
                cover_img: cover_img || "",
                businessAgree,
                accountIsPublic,
                postCount,
                followerCount,
                followingCount,
                type_of_service: type_of_service || "",
                category: category || "",
                sub_category: sub_category || "",
                ownerName: ownerName || "",
                businessAddress: businessAddress || "",
                businessCity: busCity || "",
                businessState: busState || "",
                businessPinCode: busPinCode || "",
                businessEmail: busEmail || "",
                businessPhone: busPhone || "",
                businessType: businessType || "",
                natureOfBusiness: natureOfBusiness || "",
                businessName: businessName || "",
                important,
    
                // Chat-related fields
                onlineStatus,
                isTyping,
                lastOnline,
                currentChatRoom,
                unreadMessagesCount,
            });
    
    
            return { success: true, user: updatedUser, business };
    
        } catch (error) {
            console.error("Error in registerUserWithBusiness:", error);
            throw { status: error.status || 500, message: error.message || "Internal Server Error" };
        }
    },

    //   ========== Bio (Add & Update) ==========
    addAndUpdateBio: async (data) => {
        try {
            const { 
                userId, 
                bio, 
                title, 
                skills, 
                hobbies, 
                education, 
                degree, 
                field, 
                institution, 
                year, 
                grade, 
                achievements 
            } = data;
    
            if (!userId) {
                throw { status: 400, message: "User ID is required." };
            }
    
            // Find the user in the registerModel
            const user = await registerModel.findById(userId);
    
            if (!user) {
                throw { status: 404, message: "User not found." };
            }
    
            // Update or add fields
            user.bio = bio || user.bio;
            user.title = title || user.title;
            user.skills = skills || user.skills;
            user.hobbies = hobbies || user.hobbies;
            user.education = education || user.education;
            user.degree = degree || user.degree;
            user.field = field || user.field;
            user.institution = institution || user.institution;
            user.year = year || user.year;
            user.grade = grade || user.grade;
            user.achievements = achievements || user.achievements;
    
            // Save the updated user
            await user.save();
    
            // Return only the updated fields
            const updatedFields = {
                bio: user.bio,
                title: user.title,
                skills: user.skills,
                hobbies: user.hobbies,
                education: user.education,
                degree: user.degree,
                field: user.field,
                institution: user.institution,
                year: user.year,
                grade: user.grade,
                achievements: user.achievements,
            };
    
            return { success: true, updatedFields };
        } catch (error) {
            console.error("Error in addAndUpdateBio:", error);
            throw { status: error.status || 500, message: error.message || "Internal Server Error" };
        }
    },
    
    
    // ==================================
    login: async (data) => {
        const { email, phn_number, password } = data;
        try {
            let user;
    
            if (phn_number) {
                user = await registerModel.findOne({ phn_number });
            } else if (email) {
                user = await registerModel.findOne({ email });
            }
    
            if (!user) {
                throw { msg: "User not found, please register" };
            }
    
            if (email) {
                const isPasswordMatch = await bcrypt.compare(password, user.password);
                if (!isPasswordMatch) {
                    throw { msg: "Invalid credentials" };
                }
            }
    
            const business = await businessregisterModel.findOne({ user_id: user._id });
    
            const token = jwt.sign(
                { user_id: user._id },
                SECRET_KEY,
                { expiresIn: "7d" }
            );
    
            return {
                status: 200,
                msg: "Login successful",
                login: {
                    token,
                    user:user,
                    business: business? business: null,
                },
            };
        } catch (error) {
            console.error("Error in login:", error);
            return {
                status: 500,
                msg: error.msg || "Something went wrong",
                login: null,
            };
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

            const updatedUser = await registerModel.findOneAndUpdate(
                { _id: user_id },
                { $set: { otp: hashedOtp } },
                { new: true }
            );

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
                throw new Error("User not found")
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
        const { user_id, addNew_Interest, interest, profile_url } = data
        try {
            const update = await registerModel.findByIdAndUpdate(user_id, {
                profile_url, addNew_Interest, interest

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
                throw new Error("User not found or update failed")
            }

            return { password: update.password };
        } catch (error) {
            console.error("Error in forgotPassword:", error);
            throw error;
        }
    },
    // ====================
    businessRegister: async (data) => {
        const { isSameNumberBusiness, Brand_Name, org_name, PAN_NO, aadhar_img, pan_img, GST_NO, status, Name, address,
            location_id, brand_logo, cover_img, agree, type_of_service, category, sub_category } = data;


        try {
            if (isSameNumberBusiness == true) {
                const addressDoc = await locationModel.create({ address });
                const register = await businessregisterModel.create({
                    location_id: addressDoc._id,
                    Brand_Name,
                    org_name,
                    PAN_NO,
                    GST_NO,
                    Name,
                    status,
                    aadhar_img,
                    pan_img,
                    brand_logo,
                    cover_img,
                    agree,
                    type_of_service,
                    category,
                    sub_category
                });

                return register;
            } else {
                throw new Error("Invalid data to create a business account");
            }
        } catch (error) {
            throw error;
        }
    },

    // ========================
    getPendingStatus: async () => {
        try {
            const getStatus = await businessregisterModel.find({ status: "Inactive" });
            return getStatus
        } catch (error) {
            throw error
        }
    },
    // =========================
    updateBusinessStatus: async (data) => {
        try {
            const updateBusinessStatus = await businessregisterModel.findOneAndUpdate({ _id: data.business_id },
                { status: data.status },
                { new: true }
            );
            return updateBusinessStatus
        } catch (error) {
            throw error
        }
    },
    // =======================
    // searchRecommendation: async (query, typeOfSearch = "Name", page = 1, limit = 25) => {
    //     try {
    //         if (!query || typeof query !== 'string' || !query.trim()) {
    //             return { success: false, message: "Invalid or missing query parameter" };
    //         }
    
    //         const normalizedQuery = query.toLowerCase();
    //         let results;
    
    //         const isNumericQuery = !isNaN(normalizedQuery);
    
    //         // Handle search for different types
    //         if (typeOfSearch === "Location") {
    //             const locationResults = await locationModel.find({
    //                 $or: [
    //                     { 'address.street': { $regex: normalizedQuery, $options: 'i' } },
    //                     { 'address.city': { $regex: normalizedQuery, $options: 'i' } },
    //                     { 'address.district': { $regex: normalizedQuery, $options: 'i' } },
    //                     { 'address.country': { $regex: normalizedQuery, $options: 'i' } },
    //                     ...(isNumericQuery ? [{ 'address.Pincode': { $eq: Number(normalizedQuery) } }] : [])
    //                 ]
    //             }).select('_id address');
    
    //             if (locationResults.length === 0) {
    //                 return { success: false, message: "No matching locations found" };
    //             }
    
    //             const locationIds = locationResults.map(location => location._id);
    //             results = await registerModel.find({
    //                 location_id: { $in: locationIds }
    //             }).select('_id full_Name profile_url location_id');
    //         } else if (typeOfSearch === "Name") {
    //             results = await registerModel.find()
    //                 .select('_id full_Name profile_url location_id')
    //                 .populate('location_id', 'address');
    //         } else if (typeOfSearch === "Business") {
               
    //             results = await businessregisterModel.find({
    //                 $or: [
    //                     { businessAddress: { $regex: normalizedQuery, $options: 'i' } },
    //                     { businessCity: { $regex: normalizedQuery, $options: 'i' } },
    //                     { businessState: { $regex: normalizedQuery, $options: 'i' } },
    //                     { businessPinCode: { $regex: normalizedQuery, $options: 'i' } },
    //                     { businessName: { $regex: normalizedQuery, $options: 'i' } }
    //                 ]
    //             }).select('_id businessName ownerName businessEmail businessPhone businessAddress businessCity businessState businessPinCode natureOfBusiness');
    //         } else {
    //             return { success: false, message: "Invalid TypeOfSearch parameter" };
    //         }
    
          
    //         const filteredResults = await Promise.all(
    //             results.map(async (result) => {
    //                 let score = -1;
    
    //                 if (typeOfSearch === "Name") {
    //                     const fullNameLower = result.full_Name.toLowerCase();
    //                     if (fullNameLower.startsWith(normalizedQuery)) {
    //                         score = 100;
    //                     } else if (fullNameLower.includes(normalizedQuery)) {
    //                         score = 50;
    //                     }
    //                 } else if (typeOfSearch === "Location" && result.location_id) {
    //                     const locationAddress = await locationModel.findById(result.location_id);
    //                     if (!locationAddress) return null;
    
    //                     const { street, city, district, country, Pincode } = locationAddress.address || {};
    
    //                     const locationFields = [street, city, district, country].map(field =>
    //                         field ? field.toString().toLowerCase() : ''
    //                     );
    
    //                     if (locationFields.some(field => field.includes(normalizedQuery))) {
    //                         score = 100;
    //                     } else if (Pincode && Pincode.toString().includes(normalizedQuery)) {
    //                         score = 100;
    //                     }
    //                 } else if (typeOfSearch === "Business") {
    //                     const { businessName, businessCity, businessState, businessPinCode } = result;
    //                     const businessFields = [businessName, businessCity, businessState, businessPinCode].map(field =>
    //                         field ? field.toString().toLowerCase() : ''
    //                     );
    
    //                     if (businessFields.some(field => field.includes(normalizedQuery))) {
    //                         score = 100;
    //                     }
    //                 }
    
    //                 return score > 0
    //                     ? {
    //                         id: result._id,
    //                         businessName: typeOfSearch === "Business" ? result.businessName : result.Name,
    //                         type: typeOfSearch === "Business" ? "business" : "User",
    //                         profile_url: result.profile_url || "",
    //                         email: typeOfSearch === "Business" ? result.businessEmail : undefined,
    //                         phone: typeOfSearch === "Business" ? result.businessPhone : undefined,
    //                         score,
    //                         location: typeOfSearch === "Business"
    //                             ? {
    //                                 address: result.businessAddress,
    //                                 city: result.businessCity,
    //                                 state: result.businessState,
    //                                 pinCode: result.businessPinCode
    //                               }
    //                             : result.location_id ? result.location_id.address : null
    //                     }
    //                     : null;
    //             })
    //         );
    
    //         const filteredResultsWithoutNulls = filteredResults.filter(item => item !== null);
    //         filteredResultsWithoutNulls.sort((a, b) => b.score - a.score);
    
    //         if (filteredResultsWithoutNulls.length === 0) {
    //             return { success: false, message: "No matching results found" };
    //         }
    
    //         const totalResults = filteredResultsWithoutNulls.length;
    //         const totalPages = Math.ceil(totalResults / limit);
    //         const currentPage = Math.max(1, Math.min(page, totalPages));
    //         const startIndex = (currentPage - 1) * limit;
    //         const paginatedResults = filteredResultsWithoutNulls.slice(startIndex, startIndex + limit);
    // const fileterpaginatedResults=paginatedResults.map(items=>({
    //     id:items.id,
    //     businessName:items.businessName,
    //     type:items.type,
    //     profile_url:items.profile_url,
    //     score:items.score

        
    // }))
    //         return {
    //             success: true,
    //             data: fileterpaginatedResults,
    //             pagination: {
    //                 totalResults,
    //                 totalPages,
    //                 currentPage,
    //                 limit,
    //                 hasNextPage: currentPage < totalPages,
    //                 hasPreviousPage: currentPage > 1
    //             }
    //         };
    
    //     } catch (error) {
    //         return { success: false, message: error.message };
    //     }
    // },
    searchRecommendation: async (query, typeOfSearch = "Name", page = 1, limit = 25) => {
        try {
            if (!query || typeof query !== 'string' || !query.trim()) {
                return { success: false, message: "Invalid or missing query parameter" };
            }
    
            const normalizedQuery = query.toLowerCase();
            let results;
    
            if (typeOfSearch === "Location") {
                const conditions = [
                    { 'address.street': { $regex: normalizedQuery, $options: 'i' } },
                    { 'address.city': { $regex: normalizedQuery, $options: 'i' } },
                    { 'address.district': { $regex: normalizedQuery, $options: 'i' } },
                    { 'address.country': { $regex: normalizedQuery, $options: 'i' } }
                ];
                
                // If the query is a number, add a condition for Pincode
                if (!isNaN(query)) {
                    conditions.push({ 'address.Pincode': Number(query) });
                }
                
                const locationResults = await locationModel.find({
                    $or: conditions
                }).select('_id address');
                
                
                const locationIds = locationResults.map(location => location._id);
    
                const userResults = await registerModel.find({
                    location_id: { $in: locationIds }
                }).select('_id full_Name profile_url');
    
                const formattedUserResults = userResults.map(user => ({
                    _id: user._id,
                    full_Name: user.full_Name,
                    type: "User",
                    profile_url: user.profile_url || "",
                    score: 1 // Assign a base score
                }));
                const businessConditions = [
                    { businessAddress: { $regex: normalizedQuery, $options: 'i' } },
                    { businessCity: { $regex: normalizedQuery, $options: 'i' } },
                    { businessState: { $regex: normalizedQuery, $options: 'i' } }
                ];
                
                if (!isNaN(query)) {
                    businessConditions.push({ businessPinCode: Number(query) });
                }
                
                const businessResults = await businessregisterModel.find({
                    $or: businessConditions
                }).select('_id businessName brand_logo');
                
    
                const formattedBusinessResults = businessResults.map(business => ({
                    _id: business._id,
                    name: business.businessName,
                    type: "Business",
                    profile_url: business.brand_logo || "",
                    score: 1 // Assign a base score
                }));
    
                results = [...formattedUserResults, ...formattedBusinessResults];
            } else if (typeOfSearch === "Name") {
                const userResults = await registerModel.find({
                    full_Name: { $regex: normalizedQuery, $options: 'i' }
                }).select('_id full_Name profile_url');
    
                const businessResults = await businessregisterModel.find({
                    businessName: { $regex: normalizedQuery, $options: 'i' }
                }).select('_id businessName brand_logo');
    
                results = [
                    ...userResults.map(user => ({
                        _id: user._id,
                        full_Name: user.full_Name,
                        type: "User",
                        profile_url: user.profile_url || "",
                        score: user.full_Name.toLowerCase().includes(normalizedQuery) ? 10 : 5 // Higher score for exact matches
                    })),
                    ...businessResults.map(business => ({
                        _id: business._id,
                        businessName: business.businessName,
                        type: "Business",
                        profile_url: business.brand_logo || "",
                        score: business.businessName.toLowerCase().includes(normalizedQuery) ? 10 : 5 // Higher score for exact matches
                    }))
                ];
            } else {
                return { success: false, message: "Invalid TypeOfSearch parameter" };
            }
    
            if (results.length === 0) {
                return { success: false, message: "No matching results found" };
            }
    
            // Sort results by score (highest first)
            results.sort((a, b) => b.score - a.score);
    
            // Pagination
            const totalResults = results.length;
            const totalPages = Math.ceil(totalResults / limit);
            const currentPage = Math.max(1, Math.min(page, totalPages));
            const startIndex = (currentPage - 1) * limit;
            const paginatedResults = results.slice(startIndex, startIndex + limit);
    
            return {
                success: true,
                data: paginatedResults,
                pagination: {
                    totalResults,
                    totalPages,
                    currentPage,
                    limit,
                    hasNextPage: currentPage < totalPages,
                    hasPreviousPage: currentPage > 1
                }
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },
    
    
    
    // =================
    friendRequest: async (data) => {
        const { user_id, username, profileImageUrl, isFollowing } = data;

        try {
            const updatedUser = await registerModel.findOneAndUpdate(
                { _id: user_id },
                { $push: { friend: { username, profileImageUrl, isFollowing } } },
                { new: true }
            );

            if (!updatedUser) {
                throw new Error("User not found");
            }

            return updatedUser;
        } catch (error) {
            throw error;
        }
    },
    //=========
    createPost: async (data) => {    
        const {
            user_id,
            imageUrl,
            caption,
            isScheduled,
            scheduleDateTime,
            likes,
            comments,
            tags,
            description,
            isVideo,
            location,
            mediaFile,
            thumbnailFile,
            videoDuration,
            enableComments,
            enableFavorites,
            ageGroup,
            uploadProgress,
            isProcessing,
            isTrimming,
            mentions,
            filters,
            quality,
            visibility,
            aspectRatio,
        } = data;
    
        try {
            // Validate the user
            const user = await registerModel.findById(user_id);
            if (!user) {
                throw new Error("User not found");
            }
    
            // Create the post object with all fields
            let newPost = {
                user_id,
                imageUrl,
                caption,
                isScheduled,
                scheduleDateTime,
                likes,
                comments,
                tags,
                description,
                isVideo,
                location,
                mediaFile,
                thumbnailFile,
                videoDuration,
                enableComments,
                enableFavorites,
                ageGroup,
                uploadProgress,
                isProcessing,
                isTrimming,
                mentions,
                filters,
                quality,
                visibility,
                aspectRatio,
                status: isScheduled ? "scheduled" : "published", // Set status based on scheduling
            };
    
            // Log the data to ensure it's correct
    
            // If the post is scheduled, handle scheduling logic
            if (isScheduled && scheduleDateTime) {
                // Use moment to format the schedule time correctly
                const scheduleTime = moment(scheduleDateTime).toDate();
    
                // Schedule the post to be updated when the time comes
                cron.schedule(scheduleTime, async () => {
                    try {
                        // Change the status of the post to 'published' when the scheduled time arrives
                        newPost.status = 'published';
                        await createPostModel.create(newPost); // Save the post as published
                    } catch (error) {
                        console.error('Error publishing scheduled post:', error);
                    }
                });
    
                // Log the scheduled time for verification
                // console.log(`Post scheduled for: ${scheduleTime}`);
            }
    
            // Directly create and save the new post without checking for existing ones
            const userPost = new createPostModel(newPost);
            await userPost.save();
    
            return userPost;
        } catch (error) {
            console.error("Error creating post:", error.message);
            throw new Error("Failed to create the post.");
        }
    },
    //   ==================
    getPosts: async (user_id, page = 1, limit = 25) => {
        try {
            const skip = (page - 1) * limit;

            // Fetch posts with pagination and sorting
            const posts = await postModel.find({ user_id })
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .select('imageUrl caption likes tags timestamp isVideo thumbnailFile');


            // Count total results for pagination
            const totalResults = await postModel.countDocuments({ user_id });
            const totalPages = Math.ceil(totalResults / limit);

            return {
                posts,
                pagination: {
                    totalResults,
                    totalPages,
                    currentPage: page,
                    limit,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                },
            };
        } catch (error) {
            throw error;
        }
    },
    // ======================

    followUser: async (user_id, follower_id) => {
        try {
            const verifyAcc = await registerModel.findOne({ _id: follower_id });

            if (!verifyAcc) {
                throw new Error('User not found');
            }

            let followStatus = '';
            if (verifyAcc.accountIsPublic == true) {
                followStatus = 'accepted';
            } else {
                followStatus = 'requested';
            }

            const existingFollow = await followerModel.findOne({ user_id, follower_id });
            if (existingFollow) {
                if (existingFollow.status === 'blocked') {
                    throw new Error('You are blocked by this user');
                }
                await followerModel.updateOne(
                    { user_id, follower_id },
                    { $set: { status: followStatus } }
                );
            } else {
                await followerModel.create({ user_id, follower_id, status: followStatus });
            }

            const followcount = await registerModel.findOneAndUpdate(
                { _id: user_id },
                { $inc: { followerCount: 1 } },
                { new: true }
            );

            const followingcount = await registerModel.findOneAndUpdate(
                { _id: follower_id },
                { $inc: { followingCount: 1 } },
                { new: true }
            );

            return { followcount, followingcount, status: followStatus };
        } catch (error) {
            throw new Error('Unable to follow user: ' + error.message);
        }
    },


    //==========================
    unfollowUser: async (user_id, follower_id) => {
        try {
            const unfollow = await followerModel.findOneAndDelete({ user_id, follower_id });
            await registerModel.findOneAndUpdate(
                { _id: user_id },
                { $inc: { followerCount: -1 } },
                { new: true }
            );

            await registerModel.findOneAndUpdate(
                { _id: follower_id },
                { $inc: { followingCount: -1 } },
                { new: true }
            );
            return unfollow
        } catch (error) {
            throw new Error('Unable to unfollow user: ' + error.message);
        }
    },

    // ============================

     getTopFollowersById : async (user_id, business_id, page = 1, limit = 10) => { 
        try {
            const skip = (page - 1) * limit;
            
            if (!user_id && !business_id) {
                throw new Error('Either user_id or business_id must be provided.');
            }
    
            let query = { status: 'accepted' };
    
            if (user_id) {
                query.user_id = user_id;
            }
    
            if (business_id) {
                query.business_id = business_id;
            }
    
            const getFollowers = await followerModel
                .find(query)
                .populate('follower_id', 'full_Name profile_url postCount isBusinessAccount onlineStatus')
                .populate('business_id', 'businessName postCount onlineStatus')
                .skip(skip)
                .limit(limit)
                .exec();
    
    
            for (const follower of getFollowers) {
                // Ensure that follower.follower_id exists and is not null
                const followerData = follower.follower_id;
    
                if (followerData) {
                    if (followerData.isBusinessAccount) {
                        const business = await businessregisterModel.findOne({ user_id: followerData._id });
                        if (business) {
                            follower.postCount = business.postCount;
                        }
                    } else {
                        const user = await registerModel.findOne({ _id: followerData._id });
                        if (user) {
                            follower.postCount = user.postCount;
                        }
                    }
                } else {
                    console.log('No follower data found for', follower._id);
                }
            }
    
            const totalAcceptedFollowers = await followerModel.countDocuments(query);
    
            getFollowers.sort((a, b) => b.postCount - a.postCount);
    
            return {
                followers: getFollowers,
                totalFollowers: totalAcceptedFollowers,
                pagination: {
                    totalResults: totalAcceptedFollowers,
                    totalPages: Math.ceil(totalAcceptedFollowers / limit),
                    currentPage: page,
                    limit,
                    hasNextPage: page < Math.ceil(totalAcceptedFollowers / limit),
                    hasPreviousPage: page > 1,
                },
            };
        } catch (error) {
            throw new Error('Unable to fetch followers: ' + error.message);
        }
    },
    

    getFollowers: async (user_id, page = 1, limit = 10) => {
        try {
            // Calculate the number of documents to skip
            const skip = (page - 1) * limit;
    
            // Fetch followers with pagination
            const getFollowers = await followerModel
                .find({ user_id })
                .populate('follower_id', 'full_Name profile_url')
                .skip(skip) // Skip documents for previous pages
                .limit(limit) // Limit the number of documents to fetch
                .exec();
    
            // Get the total count of followers for the given user
            const totalFollowers = await followerModel.countDocuments({ user_id });
    
            return {
                followers: getFollowers,
                totalFollowers,
                currentPage: page,
                totalPages: Math.ceil(totalFollowers / limit),
            };
        } catch (error) {
            throw new Error('Unable to fetch followers: ' + error.message);
        }
    },
    

    // ============================
    getFollowing: async (follower_id, page = 1, limit = 10) => {
        try {
            const skip = (page - 1) * limit;

            const getFollowing = await followerModel
                .find({ follower_id })
                .populate('user_id', 'full_Name profile_url')
                .skip(skip) 
                .limit(limit)
                .exec();
    
            const totalFollowing = await followerModel.countDocuments({ follower_id });
    
            return {
                following: getFollowing,
                totalFollowing,
                currentPage: page,
                totalPages: Math.ceil(totalFollowing / limit),
            };
        } catch (error) {
            throw new Error('Unable to fetch following: ' + error.message);
        }
    },
    
    //   ====================
    AcceptRequest: async (data) => {
        const { follow_id, status } = data
        try {
            const statuss = await followerModel.findByIdAndUpdate(follow_id,
                { status: status },
                { new: true })
            return status
        } catch (error) {
            throw error
        }
    },
    //   =============================
    getMentionUser : async (query) => {
        try {
            if (!query || typeof query !== 'string') {
                throw new Error('Invalid query parameter. Expected a non-empty string.');
            }
    
            const userSearchCondition = { full_Name: { $regex: query, $options: 'i' } };
            const businessSearchCondition = { businessName: { $regex: query, $options: 'i' } };
    
            const [users, businesses] = await Promise.all([
                registerModel.find(userSearchCondition).select('full_Name profile_url').limit(20),
                businessregisterModel.find(businessSearchCondition).select('businessName brand_logo').limit(20)
            ]);
    
            const userResults = users.map(user => ({
                id: user._id,
                name: user.full_Name,
                imageUrl: user.profile_url,
                score: levenshtein.get(query.toLowerCase(), user.full_Name.toLowerCase())
            }));
    
            const businessResults = businesses.map(business => ({
                id: business._id,
                name: business.businessName,
                imageUrl: business.brand_logo,
                score: levenshtein.get(query.toLowerCase(), business.businessName.toLowerCase())
            }));
    
            const allResults = [...userResults, ...businessResults];
    
            const sortedResults = allResults
                .sort((a, b) => a.score - b.score) // Sort by score (lower is better)
                .slice(0, 3); // Return top 3 results
    
            return sortedResults.map(({ id, name, imageUrl }) => ({ id, name, imageUrl }));
        } catch (error) {
            throw new Error('Unable to fetch mention users');
        }
    },
    
    
    //   =============================
    suggestUsers: async (user_id) => {
        try {
            const currentUser = await registerModel.findById(user_id);

            const currentUserFollowers = await followerModel.find({ user_id: user_id, status: 'accepted' }).select('follower_id');
            const followerIds = currentUserFollowers.map(follow => follow.follower_id);

            const interestMatches = await registerModel.find({
                interest: { $in: currentUser.interest },
                _id: { $ne: user_id },
                accountIsPublic: true,
            });

            const mutualFollowers = await registerModel.aggregate([
                {
                    $lookup: {
                        from: 'followers',
                        localField: '_id',
                        foreignField: 'follower_id',
                        as: 'followers'
                    }
                },
                { $unwind: '$followers' },
                {
                    $match: {
                        'followers.user_id': { $in: followerIds },
                        _id: { $ne: user_id }
                    }
                },
                { $limit: 10 }
            ]);

            const userLocation = await locationModel.findById(currentUser.location_id);

            if (!userLocation) {
                console.warn("User's location not found, skipping location-based suggestions");
            }

            const locationMatches = userLocation
                ? await registerModel.find({
                    location_id: currentUser.location_id,
                    _id: { $ne: user_id }, // Exclude current user
                    accountIsPublic: true,
                })
                : [];

            const suggestedUsers = [...new Set([...interestMatches, ...mutualFollowers, ...locationMatches])];

            return suggestedUsers;

        } catch (error) {
            console.error('Error fetching suggestions:', error);
            throw new Error('Unable to fetch suggestions');
        }
    },
// =================================
addMention: async (data) => {
    try {
        // Validate input data
        if (!data || typeof data !== 'object') {
            return { success: false, message: "Invalid data provided" };
        }

        const { user_id, mentionType, mentionDetails } = data;

        // Check required fields
        if (!user_id || !mentionType) {
            return { success: false, message: "user_id and mentionType are required" };
        }

        // Validate mentionDetails
        if (mentionDetails && typeof mentionDetails !== 'object') {
            return { success: false, message: "mentionDetails must be an object" };
        }

        if (mentionDetails && mentionDetails.friends) {
            if (!Array.isArray(mentionDetails.friends)) {
                return { success: false, message: "Friends must be an array of full_Name" };
            }

            // Validate each friend's full_Name
            const validFriends = [];
            for (const friendName of mentionDetails.friends) {
                const friend = await registerModel.findOne({ full_Name: friendName }); // Query using `full_Name`
                if (friend) {
                    validFriends.push({
                        friend_id: friend._id,
                        full_Name: friend.full_Name,
                    }); // Add valid friend with their ID and name
                }
            }

            // If no valid friends are found
            if (validFriends.length === 0) {
                return { success: false, message: "No valid friends found for the provided names" };
            }

            // Update mentionDetails with valid friends
            mentionDetails.friends = validFriends;
        }

        // Create the mention record
        const result = await mentionModel.create({
            user_id,
            mentionType,
            mentionDetails: mentionDetails || {},
        });

        // Return success response
        return {
            success: true,
            message: "Mention added successfully",
            data: result,
        };
    } catch (error) {
        console.error("Error adding mention:", error);

        // Return error response
        return { success: false, message: "An error occurred while adding mention", error: error.message };
    }
},



mention:cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();
      await mentionModel.updateMany(
        { mentionType: "story", expiresAt: { $lte: now }, status: "active" },
        { $set: { status: "expired" } }
      );
      console.log("Expired story mentions updated");
    } catch (error) {
      console.error("Error updating expired mentions:", error.message);
    }
  })


}



export default adminService;