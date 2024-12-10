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
import mongoose from "mongoose"
import cron from "node-cron"
const client = new twilio(process.env.AccountSID, process.env.AuthToken);
const SECRET_KEY = crypto.randomBytes(32).toString('hex');

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

            console.log("Generated OTP:", otp);

            const emailSent = await adminService.SendOTPEmail(email, otp);
            console.log("Email sending status:", emailSent);
            const existingOtpRecord = await otpModel.findOne({ email });
            if (existingOtpRecord) {
                const hashedOtp = await bcrypt.hash(otp, 10);
                existingOtpRecord.reg_otp = hashedOtp;
                await existingOtpRecord.save();
                console.log("OTP updated for existing email");
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
            console.log('Hashed OTP:', hashedOtp);

            const updatedUser = await registerModel.findOneAndUpdate(
                { _id: user_id },
                { $set: { reg_otp: hashedOtp } },
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

    // ================
    SendOTPEmail: async (receiverMail, otp) => {
        console.log(receiverMail, otp, "jsonw");

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
                subject: "SOCO OTP Code for Verification",
                text: `Dear User,
            
            Thank you for choosing soco!
            
            Your One-Time Password (OTP) for account registration is: ${otp}
            
            Please use this OTP to complete your registration within the next 10 minutes. For your security, do not share this OTP with anyone.
            
            If you did not initiate this request, please disregard this email. For assistance, feel free to contact our support team at support@soco.com.
            
            Thank you for trusting soco. We're excited to have you onboard!
            
            Best regards,  
            The soco Team`
            };

            const info = await transporter.sendMail(mailOptions);
            console.log("OTP email sent:", info.response);

            return info.response;
        } catch (error) {
            console.error("Error in sending OTP Email:", error);
            throw new Error("Error in sending OTP Email")
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

            // Check for existing users
            const existingUser = await Promise.all([
                registerModel.findOne({ full_Name }),
                registerModel.findOne({ phn_number }),
                registerModel.findOne({ email }),
            ]);

            if (existingUser[0]) errors.push("Name already exists. Name must be unique.");
            if (existingUser[1]) errors.push("Phone number already exists. Try a different one or log in.");
            if (existingUser[2]) errors.push("Email already exists. Try a different one or log in.");

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
            });

            console.log("User registered:", register);

            // Create the address
            const addressEntry = await locationModel.create({
                user_id: register._id,
                address,
            });

            console.log("Address created:", addressEntry);

            // Update user with address ID
            const updatedUser = await registerModel.findByIdAndUpdate(
                register._id,
                { location_id: addressEntry._id },
                { new: true }
            );

            console.log("Updated user:", updatedUser);

            // Create business entry
            const business = await businessregisterModel.create({
                // location_id: addressEntry._id,
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
            });

            console.log("Business registered:", business);

            return { success: true, user: updatedUser, business };

        } catch (error) {
            console.error("Error in registerUserWithBusiness:", error);
            throw { status: error.status || 500, message: error.message || "Internal Server Error" };
        }
    },


    // ==================================
    login: async (data) => {
        const { full_Name, email, phn_number, password } = data;
        try {
            if (phn_number) {
                const user = await registerModel.findOne({ phn_number });
                if (!user) {
                    throw { msg: "User not found, please register" };
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
                    status: 200,
                    msg: "Authentication successful",
                    login: {
                        user_id: user._id,
                        full_Name: user.full_Name,
                        email: user.email,
                        phn_number: user.phn_number,
                        location_id: user.location_id,
                        dob: user.DOB,
                        agree: user.agree,
                        isSameNumberBusiness: user.isSameNumberBusiness,
                        interest: user.interest,
                        addNewInterest: user.addNewInterest,
                        status: user.status,
                        regOtpId: user.reg_otp_id,
                        timestamp: user.timestamp,
                    },
                };
            } else {
                const user = await registerModel.findOne({ email });
                if (!user) {
                    return {
                        status: 400,
                        msg: "Invalid credentials",
                        login: null,
                    };
                }

                const isPasswordMatch = await bcrypt.compare(password, user.password);
                if (!isPasswordMatch) {
                    return {
                        status: 400,
                        msg: "Invalid credentials",
                        login: null,
                    };
                }

                const token = jwt.sign(
                    { user_id: user._id },
                    SECRET_KEY
                );

                return {
                    status: 200,
                    msg: "Login successful",
                    login: {
                        token,
                        user: {
                            id: user._id,
                            full_Name: user.full_Name,
                            email: user.email,
                            phn_number: user.phn_number,
                            location_id: user.location_id,
                            dob: user.DOB,
                            agree: user.agree,
                            isSameNumberBusiness: user.isSameNumberBusiness,
                            interest: user.interest,
                            addNewInterest: user.addNewInterest,
                            status: user.status,
                            regOtpId: user.reg_otp_id,
                            timestamp: user.timestamp,
                        },
                    },
                };
            }
        } catch (error) {
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

        console.log(data, "Received Data");

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
    searchRecommendation: async (query, typeOfSearch = "Name", page = 1, limit = 25) => {
        try {
            if (!query || typeof query !== 'string' || !query.trim()) {
                return { success: false, message: "Invalid or missing query parameter" };
            }
    
            const normalizedQuery = query.toLowerCase();
            let results;
    
            const isNumericQuery = !isNaN(normalizedQuery);
    
            // Handle search for different types
            if (typeOfSearch === "Location") {
                const locationResults = await locationModel.find({
                    $or: [
                        { 'address.street': { $regex: normalizedQuery, $options: 'i' } },
                        { 'address.city': { $regex: normalizedQuery, $options: 'i' } },
                        { 'address.district': { $regex: normalizedQuery, $options: 'i' } },
                        { 'address.country': { $regex: normalizedQuery, $options: 'i' } },
                        ...(isNumericQuery ? [{ 'address.Pincode': { $eq: Number(normalizedQuery) } }] : [])
                    ]
                }).select('_id address');
    
                if (locationResults.length === 0) {
                    return { success: false, message: "No matching locations found" };
                }
    
                const locationIds = locationResults.map(location => location._id);
                results = await registerModel.find({
                    location_id: { $in: locationIds }
                }).select('_id full_Name profile_url location_id');
            } else if (typeOfSearch === "Name") {
                results = await registerModel.find()
                    .select('_id full_Name profile_url location_id')
                    .populate('location_id', 'address');
            } else if (typeOfSearch === "Business") {
               
                results = await businessregisterModel.find({
                    $or: [
                        { businessAddress: { $regex: normalizedQuery, $options: 'i' } },
                        { businessCity: { $regex: normalizedQuery, $options: 'i' } },
                        { businessState: { $regex: normalizedQuery, $options: 'i' } },
                        { businessPinCode: { $regex: normalizedQuery, $options: 'i' } },
                        { businessName: { $regex: normalizedQuery, $options: 'i' } }
                    ]
                }).select('_id businessName ownerName businessEmail businessPhone businessAddress businessCity businessState businessPinCode natureOfBusiness');
            } else {
                return { success: false, message: "Invalid TypeOfSearch parameter" };
            }
    
          
            const filteredResults = await Promise.all(
                results.map(async (result) => {
                    let score = -1;
    
                    if (typeOfSearch === "Name") {
                        const fullNameLower = result.full_Name.toLowerCase();
                        if (fullNameLower.startsWith(normalizedQuery)) {
                            score = 100;
                        } else if (fullNameLower.includes(normalizedQuery)) {
                            score = 50;
                        }
                    } else if (typeOfSearch === "Location" && result.location_id) {
                        const locationAddress = await locationModel.findById(result.location_id);
                        if (!locationAddress) return null;
    
                        const { street, city, district, country, Pincode } = locationAddress.address || {};
    
                        const locationFields = [street, city, district, country].map(field =>
                            field ? field.toString().toLowerCase() : ''
                        );
    
                        if (locationFields.some(field => field.includes(normalizedQuery))) {
                            score = 100;
                        } else if (Pincode && Pincode.toString().includes(normalizedQuery)) {
                            score = 100;
                        }
                    } else if (typeOfSearch === "Business") {
                        const { businessName, businessCity, businessState, businessPinCode } = result;
                        const businessFields = [businessName, businessCity, businessState, businessPinCode].map(field =>
                            field ? field.toString().toLowerCase() : ''
                        );
    
                        if (businessFields.some(field => field.includes(normalizedQuery))) {
                            score = 100;
                        }
                    }
    
                    return score > 0
                        ? {
                            id: result._id,
                            name: typeOfSearch === "Business" ? result.businessName : result.full_Name,
                            type: typeOfSearch === "Business" ? "business" : "normal",
                            profile_url: result.profile_url || "",
                            email: typeOfSearch === "Business" ? result.businessEmail : undefined,
                            phone: typeOfSearch === "Business" ? result.businessPhone : undefined,
                            score,
                            location: typeOfSearch === "Business"
                                ? {
                                    address: result.businessAddress,
                                    city: result.businessCity,
                                    state: result.businessState,
                                    pinCode: result.businessPinCode
                                  }
                                : result.location_id ? result.location_id.address : null
                        }
                        : null;
                })
            );
    
            const filteredResultsWithoutNulls = filteredResults.filter(item => item !== null);
            filteredResultsWithoutNulls.sort((a, b) => b.score - a.score);
    
            if (filteredResultsWithoutNulls.length === 0) {
                return { success: false, message: "No matching results found" };
            }
    
            const totalResults = filteredResultsWithoutNulls.length;
            const totalPages = Math.ceil(totalResults / limit);
            const currentPage = Math.max(1, Math.min(page, totalPages));
            const startIndex = (currentPage - 1) * limit;
            const paginatedResults = filteredResultsWithoutNulls.slice(startIndex, startIndex + limit);
    
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
        console.log("Received data for creating post:", data);

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

            // Create the post object
            let newPost = {
                imageUrl,
                caption,
                isScheduled,
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
                status: isScheduled ? "scheduled" : "published",
            };

            if (isScheduled) {
                if (!scheduleDateTime) {
                    throw new Error("Scheduled date and time must be provided for scheduled posts.");
                }

                const scheduledTime = new Date(scheduleDateTime);
                console.log(scheduledTime, "scheduledTime");

                if (isNaN(scheduledTime.getTime())) {
                    throw new Error("Invalid scheduleDateTime provided.");
                }

                const now = new Date();
                const delay = scheduledTime.getTime() - now.getTime();

                if (delay > 0) {
                    console.log(`Post will be stored after ${delay} ms`);

                    setTimeout(async () => {
                        try {
                            newPost.scheduleDateTime = scheduledTime;

                            // Change the status to "published" before saving
                            newPost.status = "published";

                            let userPost = await postModel.findOne({ user_id });

                            if (!userPost) {
                                userPost = await postModel.create({ user_id, posts: [newPost] });
                            } else {
                                userPost.posts.push(newPost);
                                await userPost.save();
                            }
                            console.log("Post saved successfully at the scheduled time:", userPost);

                        } catch (error) {
                            console.error("Error storing scheduled post:", error.message);
                        }
                    }, delay);

                    return { message: "Post scheduled successfully", status: "scheduled" }; // Respond immediately
                } else {
                    throw new Error("Scheduled time is in the past. Please provide a future date and time.");
                }
            } else {
                newPost.status = "published";

                let userPost = await postModel.findOne({ user_id });

                if (!userPost) {
                    userPost = await postModel.create({ user_id, posts: [newPost] });
                } else {
                    userPost.posts.push(newPost);
                    await userPost.save();
                }

                console.log("Post saved successfully:", userPost);
                return userPost;
            }
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
                .select('imageUrl caption likes tags timestamp');

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
            console.log(verifyAcc);

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

            console.log(interestMatches, "int")

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

            console.log(mutualFollowers, "mu")
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

            console.log(locationMatches, "lo")
            const suggestedUsers = [...new Set([...interestMatches, ...mutualFollowers, ...locationMatches])];

            return suggestedUsers;

        } catch (error) {
            console.error('Error fetching suggestions:', error);
            throw new Error('Unable to fetch suggestions');
        }
    },



}



export default adminService;