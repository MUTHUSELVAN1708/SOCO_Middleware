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
import levenshtein from "fast-levenshtein";
import mongoose from "mongoose";
import moment from "moment";
import cron from "node-cron";
import mentionModel from "../model/mentionModel.js";
import connectedUsers from "../../socket.js";
import pushnotofication from "../pushNotification.js"
import cartModel from "../model/cartModel.js";
import MessageModel from "../model/chatModel.js";
import redisService from "./redisService.js";
import Product from "../model/Product.js";
import DeliveryAddressModel from "../model/deliveryAddressModel.js";


const client = new twilio(process.env.AccountSID, process.env.AuthToken);
const SECRET_KEY = crypto.randomBytes(32).toString('hex');

const adminService = {
    register: async (data) => {
        const { full_Name, phn_number, email, DOB, reg_otp_id, password, status, address, isSameNumberBusiness, agree, deviceToken } = data;
        try {
            const phnNumber = await registerModel.findOne({ phn_number });
            if (phnNumber) {
                const phnNumber = await registerModel.findOne({ phn_number });
                if (phnNumber) {
                    const error = new Error("phone number is already exist");
                    error.status = 400;
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
                    deviceToken,
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
                error.status = 500;
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
                subject: "Verify Your Soco Account",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background-color: #0066cc; padding: 20px; text-align: center;">
                            <h1 style="color: white; margin: 0;">Welcome to Soco</h1>
                        </div>
                        
                        <div style="padding: 20px; background-color: #ffffff;">
                            <h2 style="color: #333333;">Verify Your Email</h2>
                            
                            <p>Hello,</p>
                            
                            <p>Welcome to Soco – where professionals connect, collaborate, and grow together. We're excited to have you join our community of entrepreneurs, business leaders, and innovators.</p>
                            
                            <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; text-align: center; border-radius: 5px;">
                                <h2 style="color: #0066cc; margin: 0;">Your Verification Code</h2>
                                <div style="font-size: 32px; font-weight: bold; color: #333333; margin: 10px 0;">${otp}</div>
                            </div>
                            
                            <p><strong>What's next?</strong></p>
                            <ul style="padding-left: 20px;">
                                <li>Enter this code on the verification page</li>
                                <li>Complete your professional profile</li>
                                <li>Start connecting with industry leaders</li>
                                <li>Explore business opportunities</li>
                            </ul>
                            
                            <p style="color: #666666; font-size: 12px; margin-top: 20px;">For your security, please don't share this code with anyone. If you didn't request this verification, please ignore this email or contact our support team.</p>
                        </div>
                        
                        <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
                            <p style="margin: 0; color: #666666;">
                                Connect with us on
                                <a href="#" style="color: #0066cc; text-decoration: none;">LinkedIn</a> |
                                <a href="#" style="color: #0066cc; text-decoration: none;">Twitter</a> |
                                <a href="#" style="color: #0066cc; text-decoration: none;">Instagram</a>
                            </p>
                            <p style="margin: 10px 0 0 0; font-size: 12px; color: #666666;">
                                © ${new Date().getFullYear()} Soco. All rights reserved.
                            </p>
                        </div>
                    </div>
                `
            };

            const info = await transporter.sendMail(mailOptions);
            return info.response;
        } catch (error) {
            console.error("Error in sending verification email:", error);
            throw new Error("Failed to send verification email. Please try again later.");
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
                gender,
                DOB,
                deviceToken,
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
                friendPermission = false,
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
            if (!gender) errors.push("gender is required.");

            if (errors.length > 0) {
                throw { status: 400, message: errors.join(" ") };
            }
            console.log('businessName');
            console.log(businessregisterModel.findOne({ businessName }));
            // Check for existing users and business name
            const queries = [];

            if (full_Name) {
                queries.push(registerModel.findOne({ full_Name }));
            } else {
                errors.push("Name is required.");
            }

            if (phn_number) {
                queries.push(registerModel.findOne({ phn_number }));
            } else {
                errors.push("Phone number is required.");
            }

            if (email) {
                queries.push(registerModel.findOne({ email }));
            } else {
                errors.push("Email is required.");
            }

            if (businessName) {
                queries.push(businessregisterModel.findOne({ businessName })); // Check for existing businessName
            }

            // Execute queries only if no initial validation errors
            if (errors.length === 0) {
                const existingUser = await Promise.all(queries);

                if (existingUser[0]) errors.push("Name already exists. Name must be unique.");
                if (existingUser[1]) errors.push("Phone number already exists. Try a different one or log in.");
                if (existingUser[2]) errors.push("Email already exists. Try a different one or log in.");
                if (existingUser[3]) errors.push("Business name already exists. Business name must be unique.");
            }

            // If any errors were found, throw them
            if (errors.length > 0) {
                throw { status: 400, message: errors.join(" ") };
            }


            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user entry
            const register = await registerModel.create({
                location_id,
                deviceToken,
                full_Name,
                phn_number,
                password: hashedPassword,
                email,
                gender,
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
                friendPermission,
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
                needPermissionForFollowing,
                friendPermission,
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


            return { success: true, user: updatedUser, business: [business] };

        } catch (error) {
            console.error("Error in registerUserWithBusiness:", error);
            throw { status: error.status || 500, message: error.message || "Internal Server Error" };
        }
    },

    registerUserAccount: async (data) => {
        try {
            const {
                full_Name,
                phn_number,
                email,
                gender,
                DOB,
                accountIsPublic,
                deviceToken,
                reg_otp_id,
                password,
                profile_url,
                status = "active",
                address,
                agree,
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
                institution, interest,
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
            if (!gender) errors.push("Gender is required.");

            if (errors.length > 0) {
                throw { status: 400, message: errors.join(" ") };
            }

            // Check for existing users
            const existingUserQueries = [
                registerModel.findOne({ full_Name }),
                registerModel.findOne({ phn_number }),
                registerModel.findOne({ email }),
            ];

            const [existingName, existingPhone, existingEmail] = await Promise.all(existingUserQueries);

            if (existingName) errors.push("Name already exists. Name must be unique.");
            if (existingPhone) errors.push("Phone number already exists. Try a different one or log in.");
            if (existingEmail) errors.push("Email already exists. Try a different one or log in.");

            if (errors.length > 0) {
                throw { status: 400, message: errors.join(" ") };
            }

            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user entry
            const register = await registerModel.create({
                location_id: null,
                deviceToken,
                full_Name,
                phn_number,
                accountIsPublic,
                password: hashedPassword,
                email,
                gender,
                profile_url: profile_url || "",
                status,
                reg_otp_id,
                DOB,
                interest,
                agree,
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

            return { success: true, user: updatedUser };
        } catch (error) {
            console.error("Error in registerUserAccount:", error);
            throw { status: error.status || 500, message: error.message || "Internal Server Error" };
        }
    },


    registerBusinessAccount: async (data) => {
        try {
            const {
                user_id,
                Brand_Name,
                org_name,
                PAN_NO,
                aadharNo,
                GST_NO,
                aadhar_img,
                pan_img,
                brand_logo,
                cover_img,
                businessAgree,
                accountIsPublic,
                postCount = 0,
                followerCount = 0,
                followingCount = 0,
                needPermissionForFollowing = false,
                friendPermission = false,
                type_of_service,
                category,
                sub_category,
                ownerName,
                businessAddress,
                busCity,
                busState,
                busPinCode,
                busEmail,
                busPhone,
                businessType,
                natureOfBusiness,
                businessName,
                important = false,
                onlineStatus = false,
                isTyping = false,
                lastOnline = null,
                currentChatRoom = null,
                unreadMessagesCount = 0,
            } = data;

            let errors = [];

            if (!user_id) errors.push("User ID is required.");
            if (!businessName) errors.push("Business name is required.");
            if (!businessType) errors.push("Business type is required.");
            if (!natureOfBusiness) errors.push("Nature of business is required.");

            if (errors.length > 0) {
                throw { status: 400, message: errors.join(" ") };
            }

            const userId = user_id;

            // Fetch the user document using the userId found in businessregisterModel
            const existingUser = await registerModel.findById(userId);
            if (!existingUser) {
                throw { status: 404, message: "User not found for the given user ID in business profile." };
            }

            const existingBusiness = await businessregisterModel.findOne({ businessName });
            if (existingBusiness) {
                throw { status: 400, message: "Business name already exists. Business name must be unique." };
            }

            const business = await businessregisterModel.create({
                user_id,
                Brand_Name: Brand_Name || "",
                org_name: org_name || "",
                PAN_NO: PAN_NO || "",
                aadharNo: aadharNo || "",
                GST_NO: GST_NO || "",
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
                needPermissionForFollowing,
                friendPermission,
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
                businessType,
                natureOfBusiness,
                businessName,
                important,
                onlineStatus,
                isTyping,
                lastOnline,
                currentChatRoom,
                unreadMessagesCount,
            });

            return { success: true, user: existingUser, business: [business] };

        } catch (error) {
            console.error("Error in registerBusinessAccount:", error);
            throw { status: error.status || 500, message: error.message || "Internal Server Error" };
        }
    },


    updateBusinessProfile: async (data) => {
        try {
            const {
                businessId,
                businessName,
                email,
                phn_number,
                Brand_Name,
                PAN_NO,
                aadharNo,
                GST_NO,
                businessAgree,
                aadhar_img,
                pan_img,
                brand_logo,
                cover_img,
                ownerName,
                businessAddress,
                busCity,
                busState,
                busPinCode,
                busEmail,
                busPhone,
                businessType,
                natureOfBusiness,
            } = data;

            let errors = [];
            if (!businessId) errors.push("Business ID is required.");
            if (errors.length > 0) {
                throw { status: 400, message: errors.join(" ") };
            }

            // Fetch the existing business profile using businessId
            const existingBusiness = await businessregisterModel.findById(businessId);
            if (!existingBusiness) {
                throw { status: 404, message: "Business profile not found for the given business ID." };
            }

            const userId = existingBusiness.user_id;

            // Fetch the user document using the userId found in businessregisterModel
            const existingUser = await registerModel.findById(userId);
            if (!existingUser) {
                throw { status: 404, message: "User not found for the given user ID in business profile." };
            }

            // Check for duplicate businessName (case-insensitive, trimmed), phone, or email
            const duplicateCheck = await businessregisterModel.findOne({
                $or: [
                    { businessName: { $regex: `^${businessName.trim()}$`, $options: "i" } },
                    { businessPhone: phn_number },
                    { businessEmail: email }
                ],
                _id: { $ne: businessId }, // Exclude the current document
            });

            if (duplicateCheck) {
                if (duplicateCheck.businessName.toLowerCase().trim() === businessName.toLowerCase().trim()) {
                    errors.push("Business name already exists.");
                }
                if (duplicateCheck.businessPhone === phn_number) {
                    errors.push("Phone number already exists.");
                }
                if (duplicateCheck.businessEmail === email) {
                    errors.push("Email already exists.");
                }
            }

            if (errors.length > 0) {
                throw { status: 400, message: errors.join(" ") };
            }

            // Prepare updated business fields
            const updatedBusinessFields = {
                ...(businessName && { businessName: businessName.trim() }),
                ...(phn_number && { businessPhone: phn_number }),
                ...(email && { businessEmail: email }),
                ...(Brand_Name && { Brand_Name }),
                ...(PAN_NO && { PAN_NO }),
                ...(aadharNo && { aadharNo }),
                ...(GST_NO && { GST_NO }),
                ...(businessAgree !== undefined && { businessAgree }),
                ...(aadhar_img && { aadhar_img }),
                ...(pan_img && { pan_img }),
                ...(brand_logo && { brand_logo }),
                ...(cover_img && { cover_img }),
                ...(ownerName && { ownerName }),
                ...(businessAddress && { businessAddress }),
                ...(busCity && { businessCity: busCity }),
                ...(busState && { businessState: busState }),
                ...(busPinCode && { businessPinCode: busPinCode }),
                ...(busEmail && { businessEmail: busEmail }),
                ...(busPhone && { businessPhone: busPhone }),
                ...(businessType && { businessType }),
                ...(natureOfBusiness && { natureOfBusiness }),
            };

            // Update the business profile
            const updatedBusiness = await businessregisterModel.findByIdAndUpdate(
                existingBusiness._id,
                { $set: updatedBusinessFields },
                { new: true }
            );

            return { success: true, user: existingUser, business: [updatedBusiness] };
        } catch (error) {
            console.error("Error in updateBusinessProfile:", error);
            throw { status: error.status || 500, message: error.message || "Internal Server Error" };
        }
    },

    //   ========== User (Add & Update) ==========
    updateUserDetails: async (data) => {
        try {
            const {
                userId,
                name,
                phone,
                dob,
                interests,
                maritalStatus,
                followingPermission,
                friendPermission,
            } = data;

            if (!userId) {
                throw { status: 400, message: "User ID is required." };
            }

            // Validate phone number
            if (phone && (!/^\d{10}$/.test(phone))) {
                throw { status: 400, message: "Phone number must be exactly 10 digits." };
            }

            // Validate date of birth
            // if (dob && isNaN(new Date(dob).getTime())) {
            //     throw { status: 400, message: "Invalid date of birth format." };
            // }

            // Find the user in the registerModel
            const user = await registerModel.findById(userId);
            if (!user) {
                throw { status: 404, message: "User not found." };
            }

            // Check if the provided name is unique only if the name has been changed
            if (name && name.trim() !== user.full_Name.trim()) {
                const existingUser = await registerModel.findOne({
                    full_Name: name.trim(),
                });
                if (existingUser) {
                    throw { status: 400, message: "Name must be unique." };
                }
            }

            // Convert interests string to list
            let interestsList = [];
            if (interests) {
                interestsList = interests
                    .split(",")
                    .map((item) => item.trim())
                    .filter((item) => item); // Remove empty values
            }

            // Update only the fields provided
            user.full_Name = name;
            user.phn_number = phone;
            user.DOB = dob;
            user.interest = interestsList;
            user.maritalStatus = maritalStatus;
            user.needPermissionForFollowing = followingPermission;
            user.friendPermission = friendPermission;

            // Save the updated user
            await user.save();

            // Return only the updated fields
            const updatedFields = {
                name: user.full_Name,
                phone: user.phn_number,
                dob: user.DOB,
                interests: user.interest,
                maritalStatus: user.maritalStatus,
                followingPermission: user.needPermissionForFollowing,
                friendPermission: user.friendPermission,
            };

            return { success: true, updatedFields };
        } catch (error) {
            console.error("Error in updateUserDetails:", error);
            throw { status: error.status || 500, message: error.message || "Internal Server Error" };
        }
    },

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
        const { email, phn_number, password, deviceToken } = data;
        try {
            let user;

            if (phn_number) {
                user = await registerModel.findOne({ phn_number });
            } else if (email) {
                user = await registerModel.findOne({ email });
            }

            if (!user) {
                throw { msg: "Account not found. Please register to continue." };
            }

            if (email) {
                const isPasswordMatch = await bcrypt.compare(password, user.password);
                if (!isPasswordMatch) {
                    throw { msg: "Invalid credentials. Please try again or reset your password." };
                }
            }

            console.log("User ID:", user._id, "Device Token:", deviceToken);

            const updatedUser = await registerModel.findOneAndUpdate(
                { _id: user._id },
                { $addToSet: { deviceToken: deviceToken } },
                { new: true }
            );

            if (updatedUser) {
                console.log("Device tokens updated successfully:", updatedUser.deviceToken);
            } else {
                console.error("Failed to update device tokens.");
            }

            // Fetch the list of businesses associated with the user ID
            const businesses = await businessregisterModel.find({ user_id: user._id });

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
                    user: updatedUser,
                    business: businesses.length > 0 ? businesses : [],
                },
            };
        } catch (error) {
            console.error("Login error:", error);
            return {
                status: 500,
                msg: error.msg || "An error occurred during login. Please try again.",
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
        console.log(data);


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
    // createPost: async (data) => {
    //     console.log("Received data for creating post:", data);

    //     const {
    //         user_id,
    //         imageUrl,
    //         caption,
    //         isScheduled,
    //         scheduleDateTime,
    //         likes,
    //         comments,
    //         tags,
    //         description,
    //         isVideo,
    //         location,
    //         mediaFile,
    //         thumbnailFile,
    //         videoDuration,
    //         enableComments,
    //         enableFavorites,
    //         ageGroup,
    //         uploadProgress,
    //         isProcessing,
    //         isTrimming,
    //         mentions,
    //         filters,
    //         quality,
    //         visibility,
    //         aspectRatio,
    //     } = data;

    //     try {
    //         // Validate the user
    //         const user = await registerModel.findById(user_id);
    //         if (!user) {
    //             throw new Error("User not found");
    //         }

    //         // Create the post object
    //         let newPost = {
    //             imageUrl,
    //             caption,
    //             isScheduled,
    //             likes,
    //             comments,
    //             tags,
    //             description,
    //             isVideo,
    //             location,
    //             mediaFile,
    //             thumbnailFile,
    //             videoDuration,
    //             enableComments,
    //             enableFavorites,
    //             ageGroup,
    //             uploadProgress,
    //             isProcessing,
    //             isTrimming,
    //             mentions,
    //             filters,
    //             quality,
    //             visibility,
    //             aspectRatio,
    //             status: isScheduled ? "scheduled" : "published",
    //         };

    //         if (isScheduled) {
    //             if (!scheduleDateTime) {
    //                 throw new Error("Scheduled date and time must be provided for scheduled posts.");
    //             }

    //             const scheduledTime = new Date(scheduleDateTime);
    //             console.log(scheduledTime, "scheduledTime");

    //             if (isNaN(scheduledTime.getTime())) {
    //                 throw new Error("Invalid scheduleDateTime provided.");
    //             }

    //             const now = new Date();
    //             const delay = scheduledTime.getTime() - now.getTime();

    //             if (delay > 0) {
    //                 console.log(`Post will be stored after ${delay} ms`);

    //                 setTimeout(async () => {
    //                     try {
    //                         newPost.scheduleDateTime = scheduledTime;

    //                         // Change the status to "published" before saving
    //                         newPost.status = "published";

    //                         let userPost = await postModel.findOne({ user_id });

    //                         if (!userPost) {
    //                             userPost = await postModel.create({ user_id, posts: [newPost] });
    //                         } else {
    //                             userPost.posts.push(newPost);
    //                             await userPost.save();
    //                         }
    //                         console.log("Post saved successfully at the scheduled time:", userPost);
    //                     } catch (error) {
    //                         console.error("Error storing scheduled post:", error.message);
    //                     }
    //                 }, delay);

    //                 return { message: "Post scheduled successfully", status: "scheduled" }; // Respond immediately
    //             } else {
    //                 throw new Error("Scheduled time is in the past. Please provide a future date and time.");
    //             }
    //         } else {
    //             newPost.status = "published";

    //             let userPost = await createPostModel.findOne({ user_id });

    //             if (!userPost) {
    //                 userPost = await createPostModel.create({ user_id, posts: [newPost] });
    //             } else {
    //                  // Ensure that posts is an array before calling push

    //                 userPost.posts.push(newPost);
    //                 await userPost.save();
    //             }

    //             console.log("Post saved successfully:", userPost);
    //             return userPost;
    //         }
    //     } catch (error) {
    //         console.error("Error creating post:", error.message);
    //         throw new Error("Failed to create the post.");
    //     }
    // },

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
            typeOfAccount,
        } = data;

        try {
            let user;
            console.log("scheduleDateTime value:", scheduleDateTime);

            if (typeOfAccount === "business") {
                user = await businessregisterModel.findById(user_id);
            } else {
                user = await registerModel.findById(user_id);
            }

            if (!user) {
                throw new Error("User not found");
            }

            const filtersArray = Array.isArray(filters) ? filters : [];

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
                filters: filtersArray,
                quality,
                visibility,
                aspectRatio,
                status: isScheduled ? "scheduled" : "published",
            };

            if (isScheduled && scheduleDateTime) {

                const scheduleTime = moment(scheduleDateTime).toDate();

                const cronExpression = `${scheduleTime.getMinutes()} ${scheduleTime.getHours()} ${scheduleTime.getDate()} ${scheduleTime.getMonth() + 1} *`;


                if (cron.validate(cronExpression)) {
                    cron.schedule(cronExpression, async () => {
                        try {
                            newPost.status = "published";
                            await createPostModel.create(newPost);
                        } catch (error) {
                            console.error("Error publishing scheduled post:", error);
                        }
                    });
                } else {
                    throw new Error("Failed to schedule the post due to invalid cron expression.");
                }
            }


            const userPost = new createPostModel(newPost);
            await userPost.save();

            return userPost;
        } catch (error) {
            throw new Error("Failed to create the post.");
        }
    },


    // createPost: async (data) => {
    //     console.log("Received data for creating post:", data);

    //     const {
    //         user_id,
    //         imageUrl,
    //         caption,
    //         isScheduled,
    //         scheduleDateTime,
    //         likes,
    //         comments,
    //         tags,
    //         description,
    //         isVideo,
    //         location,
    //         mediaFile,
    //         thumbnailFile,
    //         videoDuration,
    //         enableComments,
    //         enableFavorites,
    //         ageGroup,
    //         uploadProgress,
    //         isProcessing,
    //         isTrimming,
    //         mentions,
    //         filters,
    //         quality,
    //         visibility,
    //         aspectRatio,
    //     } = data;

    //     try {
    //         // Validate the user
    //         const user = await registerModel.findById(user_id);
    //         if (!user) {
    //             throw new Error("User not found");
    //         }

    //         // Create the post object
    //         let newPost = {
    //             user_id,
    //             imageUrl,
    //             caption,
    //             isScheduled,
    //             scheduleDateTime: isScheduled ? new Date(scheduleDateTime) : null,
    //             likes: likes || 0,
    //             comments: comments || 0,
    //             tags: tags || [],
    //             description,
    //             isVideo,
    //             location,
    //             mediaFile,
    //             thumbnailFile,
    //             videoDuration,
    //             enableComments,
    //             enableFavorites,
    //             ageGroup,
    //             uploadProgress,
    //             isProcessing,
    //             isTrimming,
    //             mentions: mentions || [],
    //             filters: filters || [],
    //             quality,
    //             visibility,
    //             aspectRatio,
    //             status: isScheduled ? "scheduled" : "published",
    //             timestamp: new Date(), // Add current timestamp
    //         };

    //         if (isScheduled) {
    //             if (!scheduleDateTime) {
    //                 throw new Error("Scheduled date and time must be provided for scheduled posts.");
    //             }

    //             const scheduledTime = new Date(scheduleDateTime);
    //             console.log(scheduledTime, "scheduledTime");

    //             if (isNaN(scheduledTime.getTime())) {
    //                 throw new Error("Invalid scheduleDateTime provided.");
    //             }

    //             const now = new Date();
    //             const delay = scheduledTime.getTime() - now.getTime();

    //             if (delay > 0) {
    //                 console.log(`Post will be stored after ${delay} ms`);

    //                 setTimeout(async () => {
    //                     try {
    //                         newPost.status = "published"; // Update status to published after delay

    //                         // Save post directly as a new document
    //                         const savedPost = await createPostModel.create(newPost);
    //                         console.log("Post saved successfully at the scheduled time:", savedPost);
    //                     } catch (error) {
    //                         console.error("Error storing scheduled post:", error.message);
    //                     }
    //                 }, delay);

    //                 return { message: "Post scheduled successfully", status: "scheduled" }; // Respond immediately
    //             } else {
    //                 throw new Error("Scheduled time is in the past. Please provide a future date and time.");
    //             }
    //         } else {
    //             newPost.status = "published";

    //             // Save post as a new document (no array)
    //             const savedPost = await createPostModel.create(newPost);
    //             console.log("Post saved successfully:", savedPost);

    //             return savedPost;
    //         }
    //     } catch (error) {
    //         console.error("Error creating post:", error.message);
    //         throw new Error("Failed to create the post.");
    //     }
    // },

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

    getTopFollowersById: async (user_id, business_id, page = 1, limit = 10) => {
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
    // getMentionUser : async (query) => {
    //     try {
    //         if (!query || typeof query !== 'string') {
    //             throw new Error('Invalid query parameter. Expected a non-empty string.');
    //         }

    //         const userSearchCondition = { full_Name: { $regex: query, $options: 'i' } };
    //         const businessSearchCondition = { businessName: { $regex: query, $options: 'i' } };

    //         const [users, businesses] = await Promise.all([
    //             registerModel.find(userSearchCondition).select('full_Name profile_url').limit(20),
    //             businessregisterModel.find(businessSearchCondition).select('businessName brand_logo').limit(20)
    //         ]);

    //         const userResults = users.map(user => ({
    //             id: user._id,
    //             name: user.full_Name,
    //             imageUrl: user.profile_url,
    //             score: levenshtein.get(query.toLowerCase(), user.full_Name.toLowerCase())
    //         }));

    //         const businessResults = businesses.map(business => ({
    //             id: business._id,
    //             name: business.businessName,
    //             imageUrl: business.brand_logo,
    //             score: levenshtein.get(query.toLowerCase(), business.businessName.toLowerCase())
    //         }));

    //         const allResults = [...userResults, ...businessResults];

    //         const sortedResults = allResults
    //             .sort((a, b) => a.score - b.score) // Sort by score (lower is better)
    //             .slice(0, 3); // Return top 3 results

    //         return sortedResults.map(({ id, name, imageUrl }) => ({ id, name, imageUrl }));
    //     } catch (error) {
    //         throw new Error('Unable to fetch mention users');
    //     }
    // },

    getMentionUser: async (query) => {
        try {
            if (!query || typeof query !== 'string' || query.trim() === '') {
                throw new Error('Invalid query parameter. Expected a non-empty string.');
            }

            const followers = await followerModel.find({
                status: "accepted",
                isBlocked: false,
                isMuted: false
            }).select('follower_id');

            let matchingUsers = [];

            if (followers.length > 0) {
                const followerIds = followers.map(follower => follower.follower_id);
                matchingUsers = await registerModel.find({
                    _id: { $in: followerIds },
                    full_Name: { $regex: query, $options: 'i' }
                }).select('_id full_Name profile_url');
            }

            if (matchingUsers.length === 0) {
                matchingUsers = await registerModel.find({
                    full_Name: { $regex: query, $options: 'i' }
                }).select('_id full_Name profile_url');
            }

            const matchingBusinesses = await businessregisterModel.find({
                businessName: { $regex: query, $options: 'i' }
            }).select('_id businessName brand_logo');

            const results = [
                ...matchingUsers.map(user => ({
                    id: user._id,
                    name: user.full_Name,
                    imageUrl: user.profile_url,
                    type: 'user'
                })),
                ...matchingBusinesses.map(business => ({
                    id: business._id,
                    name: business.businessName,
                    imageUrl: business.brand_logo,
                    type: 'business'
                }))
            ];

            const sortedResults = results.sort((a, b) => a.name.localeCompare(b.name));

            return sortedResults.slice(0, 5);
        } catch (error) {
            console.error('Error in getMentionUser:', error);
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
            if (!data || typeof data !== 'object') {
                return { success: false, message: "Invalid data provided" };
            }

            const { user_id, mentionType, mentionDetails } = data;

            if (!user_id || !mentionType) {
                return { success: false, message: "user_id and mentionType are required" };
            }

            if (mentionDetails && typeof mentionDetails !== 'object') {
                return { success: false, message: "mentionDetails must be an object" };
            }

            if (mentionDetails && mentionDetails.friends) {
                if (!Array.isArray(mentionDetails.friends)) {
                    return { success: false, message: "Friends must be an array of full_Name" };
                }

                const validFriends = [];
                for (const friendName of mentionDetails.friends) {
                    const friend = await registerModel.findOne({ full_Name: friendName });
                    if (friend) {
                        validFriends.push({
                            friend_id: friend._id,
                            full_Name: friend.full_Name,
                        });
                    }
                }

                if (validFriends.length === 0) {
                    return { success: false, message: "No valid friends found for the provided names" };
                }

                mentionDetails.friends = validFriends;
            }

            const result = await mentionModel.create({
                user_id,
                mentionType,
                mentionDetails: mentionDetails || {},
            });

            return {
                success: true,
                message: "Mention added successfully",
                data: result,
            };
        } catch (error) {
            console.error("Error adding mention:", error);

            return { success: false, message: "An error occurred while adding mention", error: error.message };
        }
    },



    mention: cron.schedule("0 * * * *", async () => {
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
    }),

    getDynamicFollowers: async (user_id) => {
        console.log(user_id, "uuuu")
        try {
            const followers = await followerModel.find({
                user_id: user_id,
                status: 'accepted',
                isBlocked: false,
                isMuted: false
            }).select('follower_id');

            return followers.map(f => f.follower_id);
        } catch (error) {
            console.error('Error fetching followers:', error);
            return [];
        }
    },

    // ================================
    getDynamicFeed: async (user_id, visibility, tags, startDate, endDate, page = 1, limit = 10) => {
        console.log("Fetching dynamic feed:", user_id, visibility, tags, startDate, endDate, page, limit);

        try {
            const followerIds = await adminService.getDynamicFollowers(user_id);
            console.log(followerIds, "followerIds");

            if (!followerIds.length) {
                return [];
            }


            const query = {
                user_id: { $in: followerIds },
                status: "published",
            };
            console.log(query, "query");

            if (visibility) query.visibility = visibility;
            console.log(visibility, "visibility");

            if (tags && tags.length > 0) query.tags = { $in: tags };
            console.log(tags, "tags");

            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                if (!isNaN(start) && !isNaN(end)) {
                    query.timestamp = { $gte: start, $lte: end };
                }
            }

            const posts = await createPostModel
                .find(query)
                .sort({ timestamp: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .populate("user_id", "full_Name profile_url");
            console.log(posts, "posts");

            const postsWithUserDetails = await Promise.all(posts.map(async (post) => {
                console.log(post.user_id, "kj")
                const userDetails = await registerModel.findById(post.user_id);
                console.log(userDetails, "userDetails");
                return {
                    id: post._id,
                    user_id: post.user_id._id,
                    userName: userDetails ? userDetails.full_Name : 'Unknown User',
                    profileUrl: userDetails ? userDetails.profile_url : '',
                    mediaFile: post.mediaFile,
                    imageUrl: post.imageUrl,
                    caption: post.caption,
                    likes: post.likes,
                    comments: post.comments,
                    tags: post.tags,
                    location: post.location,
                    description: post.description,
                    visibility: post.visibility,
                    createdAt: post.timestamp.toISOString(), // Format timestamp
                };
            }));

            // Return posts with user details
            return postsWithUserDetails;

        } catch (error) {
            console.error("Error fetching feed:", error);
            throw new Error("Unable to fetch the feed.");
        }
    },

    // // ==================================
    // createProduct: async (data) => {
    //     const {
    //       productTitle,
    //       brand,
    //       categories,
    //       tags,
    //       seoTitle,
    //       seoDescription,
    //       seoKeywords,
    //       searchMetadata,
    //       images,
    //       description,
    //       highlights,
    //       pricing,
    //       availability,
    //       variants,
    //       specifications,
    //       deliveryConfig,
    //       ratings,
    //       careInstructions,
    //       materials,
    //       policySection,
    //       localization,
    //       paymentMethods,
    //       crossSellProducts,
    //       festivalOffers,
    //     } = data;

    //     if (!Array.isArray(data.variants)) {
    //       throw new Error("Variants should be an array.");
    //     }

    //     const existingProduct = await productModel.findOne({
    //       'variants.sku': { $in: data.variants.map((variant) => variant.sku) },
    //     });
    //     if (existingProduct) {
    //       throw new Error("SKU already exists. Please use unique SKUs.");
    //     }

    //     try {
    //       const product = await productModel.create({
    //         productTitle: productTitle || "",
    //         brand: brand || "",
    //         categories: categories || [],
    //         tags: tags || [],
    //         seoTitle: seoTitle || "",
    //         seoDescription: seoDescription || "",
    //         seoKeywords: seoKeywords || [],
    //         searchMetadata: {
    //           synonyms: searchMetadata?.synonyms || [],
    //           alternateSpellings: searchMetadata?.alternateSpellings || [],
    //         },
    //         images: images || [],
    //         descriptionHighlights: {
    //           description: description || "",
    //           highlights: highlights || [],
    //         },
    //         pricing: {
    //           regularPrice: pricing?.regularPrice || null,
    //           salePrice: pricing?.salePrice || null,
    //           discount: pricing?.discount || "",
    //           currency: pricing?.currency || "",
    //           gstDetails: {
    //             gstIncluded: pricing?.gstIncluded || null,
    //             gstPercentage: pricing?.gstPercentage || null,
    //           },
    //         },
    //         availability: {
    //           inStock: availability?.inStock || null,
    //           stockQuantity: availability?.stockQuantity || null,
    //           deliveryTime: availability?.deliveryTime || "",
    //           availabilityRegions: availability?.availabilityRegions || [],
    //           codAvailable: availability?.codAvailable || null,
    //           returnPolicy: {
    //             returnApplicable: availability?.returnPolicy?.returnApplicable || null,
    //             returnWindow: availability?.returnPolicy?.returnWindow || null,
    //             returnFees: availability?.returnPolicy?.returnFees || null,
    //           },
    //         },
    //         variants: variants.map((variant) => ({
    //           id: variant.id || "",
    //           color: variant.color || "",
    //           variant: variant.variant || "",
    //           quantity: variant.quantity || null,
    //           sku: variant.sku || "",
    //           variantImages: variant.variantImages || [],
    //         })),
    //         specifications: specifications || [],
    //         deliveryConfig: {
    //           type: deliveryConfig?.type || "",
    //           fixedCharge: deliveryConfig?.fixedCharge || null,
    //           isFreeShipping: deliveryConfig?.isFreeShipping || null,
    //           minOrderForFreeShipping: deliveryConfig?.minOrderForFreeShipping || null,
    //           maxDeliveryDistance: deliveryConfig?.maxDeliveryDistance || null,
    //           deliveryPinCodes: deliveryConfig?.deliveryPinCodes || [],
    //           deliveryPartner: deliveryConfig?.deliveryPartner || "",
    //           isReturnApplicable: deliveryConfig?.isReturnApplicable || null,
    //           returnWindow: deliveryConfig?.returnWindow || null,
    //           returnPolicyFees: deliveryConfig?.returnPolicyFees || null,
    //         },
    //         ratings: {
    //           averageRating: ratings?.averageRating || null,
    //           totalReviews: ratings?.totalReviews || null,
    //           ratingDistribution: ratings?.ratingDistribution || {},
    //           reviews: ratings?.reviews || [],
    //         },
    //         careInstructions: careInstructions || "",
    //         materials: materials || [],
    //         policySection: policySection || [],
    //         localization: localization || {},
    //         paymentMethods: paymentMethods || [],
    //         crossSellProducts: crossSellProducts?.map((product) => ({
    //           productId: product.productId || "",
    //           productTitle: product.productTitle || "",
    //           price: product.price || "",
    //           currency: product.currency || "",
    //         })) || [],
    //         festivalOffers: festivalOffers || [],
    //       });

    //       return product;
    //     } catch (error) {
    //       console.error("Error creating product:", error);
    //       throw new Error("Failed to create product. Please try again.");
    //     }
    //   },


    // // ============================
    // getproduct: async () => {
    //     try {
    //         const getproduct = await productModel.find();
    //         return getproduct
    //     } catch (error) {
    //         throw error
    //     }
    // },
    // // ============================
    // updateProduct: async (data) => {
    //     const {
    //         product_id,
    //         productTitle,
    //         brand,
    //         categories,
    //         tags,
    //         seoTitle,
    //         seoDescription,
    //         seoKeywords,
    //         searchMetadata,
    //         images,
    //         description,
    //         highlights,
    //         pricing,
    //         availability,
    //         variants,
    //         specifications,
    //         deliveryConfig,
    //         ratings,
    //         careInstructions,
    //         materials,
    //         policySection,
    //         localization,
    //         paymentMethods,
    //         crossSellProducts,
    //         festivalOffers,
    //       } = data;

    //     try {
    //         if (!product_id || !productTitle  || !categories || !pricing || !availability) {
    //             throw new Error("Missing required fields:product_id, productTitle, categories, pricing, availability");
    //         }
    //         const updateProduct = await productModel.findByIdAndUpdate(product_id,
    //             {
    //                 productTitle,
    //                 brand,
    //                 categories,
    //                 tags,
    //                 seoTitle,
    //                 seoDescription,
    //                 seoKeywords,
    //                 searchMetadata,
    //                 images,
    //                 description,
    //                 highlights,
    //                 pricing,
    //                 availability,
    //                 variants,
    //                 specifications,
    //                 deliveryConfig,
    //                 ratings,
    //                 careInstructions,
    //                 materials,
    //                 policySection,
    //                 localization,
    //                 paymentMethods,
    //                 crossSellProducts,
    //                 festivalOffers,
    //             },
    //             { new: true });
    //         return updateProduct
    //     } catch (error) {
    //         throw error
    //     }
    // },
    // // =====================
    // deleteProduct: async (product) => {
    //     try {
    //         const { product_id } = product;

    //         if (!product_id) {
    //             throw new Error("product_id is required.");
    //         }
    //         const deletedProduct = await productModel.findOneAndDelete({ _id: product_id });

    //         if (!deletedProduct) {
    //             throw new Error(`Product with ID ${product_id} not found.`);
    //         }
    //         return "Product deleted successfully";
    //     } catch (error) {
    //         console.error(`Error deleting product: ${error.message}`);
    //         throw new Error("Unable to delete product. Please try again.");
    //     }
    // },

    // ==========
    notifyUser: async (data) => {
        const { user_id, message, } = data;
        console.log(data, "data")

        try {
            const user = await registerModel.findById(user_id);

            if (!user) {
                throw new Error("User not found");
            }

            if (!user.deviceToken || user.deviceToken.length === 0) {
                throw new Error("User has no registered device tokens.");
            }

            const deviceIds = user.deviceToken;
            console.log(deviceIds, "juii")
            const response = await pushnotofication.sendNotificationToDevice(message, deviceIds);

            return response;
        } catch (error) {
            console.error("Error in notifyUser service:", error);
            throw error;
        }
    },
    // =================
    cart: async (data) => {
        const {
            user_id,
            product_id,
            images,
            colors,
            size,
            quantity,
            productName,
            category,
            unit,
            price,

        } = data;

        try {
            const user = await registerModel.findById(user_id);
            if (!user) {
                throw new Error("User not found");
            }

            const product = await productModel.findById(product_id);
            if (!product) {
                throw new Error("Product not found");
            }

            if (quantity <= 0) {
                throw new Error("Invalid initial quantity");
            }

            let cartItem = await cartModel.findOne({
                user_id,
                product_id,
            });

            if (cartItem) {
                cartItem.quantity += Number(quantity);
                cartItem.unit = unit;
                cartItem.productName = productName || product.productName;
                cartItem.size = size || product.size;
                cartItem.images = images || product.images;
                cartItem.category = category || product.category;

            } else {
                cartItem = await cartModel.create({
                    user_id,
                    product_id,
                    productName: productName || product.productName,
                    size: size || product.size,
                    unit: unit,
                    images: images || product.images,

                    category: category || product.category,
                    quantity: Number(quantity),
                    price: product.price,
                    colors: colors || product.colors,
                });
            }

            let totalPrice = 0;
            if (unit === "gram" || unit === "piece") {
                totalPrice = cartItem.quantity * product.price;
            } else {
                throw new Error("Invalid unit specified");
            }

            cartItem.price = totalPrice;
            await cartItem.save();

            return cartItem;
        } catch (error) {
            console.error("Error storing in cart:", error);
            throw {
                error: "something wrong",
            };
        }
    },

    // =======================
    removeFromCart: async (data) => {
        const { user_id, cart_id } = data;

        try {
            const cartItem = await cartModel.findById(cart_id);
            if (!cartItem) {
                throw {
                    error: "Cart item not found",
                };
            }

            if (cartItem.user_id.toString() !== user_id) {
                throw {
                    error: "Unauthorized action",
                };
            }

            const deletedItem = await cartModel.findByIdAndDelete(cart_id);
            if (!deletedItem) {
                throw {
                    error: "Failed to delete item from cart",
                };
            }

            console.log("Deleted item:", deletedItem);

            return {
                message: "Product removed from cart successfully",
            };
        } catch (error) {
            console.error("Error removing from cart:", error);
            throw {
                error: "Something went wrong",
            };
        }
    },
    //   ===========================
    getCart: async (user_id) => {
        try {
            console.log("user", user_id);

            const getCart = await cartModel.find({
                user_id: user_id,
            });
            return getCart;
        } catch (error) {
            throw {
                error: "something wrong",
            };
        }
    },
    // ================================

    sendMessage: async (from, to, message) => {
        console.log(from, to, message, "lopoop");

        const timestamp = new Date();
        const chatKey = `chat:${from}:${to}`;
        const notificationKey = `notifications:${to}`;

        try {
            // Store the message in MongoDB
            const newMessage = await MessageModel.create({ from, to, message, timestamp });
            console.log(newMessage, "new");

            // Fetch the MongoDB generated _id
            const messageWithObjectId = {
                _id: newMessage._id.toString(), // Convert ObjectId to string
                from,
                to,
                message,
                timestamp
            };

            // Store the message in Redis with the MongoDB _id
            await redisService.getRedisClient().lPush(chatKey, JSON.stringify(messageWithObjectId));

            // Publish notification to the recipient via Redis
            await redisService.getRedisClient().publish(notificationKey, JSON.stringify({ from, message }));

            // Return success message
            return { success: true, message: 'Message sent' };
        } catch (err) {
            console.error('Error in sendMessage:', err);
            throw new Error('Error sending message');
        }
    },



    //   =============
    getChatHistory: async (from, to) => {
        const chatKey1 = `chat:${from}:${to}`;
        const chatKey2 = `chat:${to}:${from}`;

        try {
            // Fetch messages from Redis (both directions)
            const messages1 = await redisService.getRedisClient().lRange(chatKey1, 0, -1);
            const messages2 = await redisService.getRedisClient().lRange(chatKey2, 0, -1);

            // Combine and sort messages by timestamp
            const combinedMessages = [...messages1, ...messages2]
                .map((msg) => JSON.parse(msg))
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            return combinedMessages;
        } catch (err) {
            console.error('Error fetching chat history:', err);
            throw new Error('Error fetching chat history');
        }
    },



    //   =====================

    getFeed: async (data) => {
        let { user_id, address } = data; 
        console.log(data, "Input Data");
        try {
            if (typeof address === "string") {
                try {
                    address = JSON.parse(address);
                } catch (err) {
                    throw new Error("Failed to parse address parameter. Please provide valid JSON.");
                }
            }
    
            const targetLat = Number(address.lat);
            const targetLng = Number(address.lng);
            if (isNaN(targetLat) || isNaN(targetLng)) {
                throw new Error("Invalid latitude or longitude values.");
            }
    
            const following = await followerModel
                .find({ follower_id: user_id, status: 'accepted' })
                .select('user_id');
            console.log(following, "Following Users");
            const followingIds = following.map(follow => follow.user_id);
            console.log(followingIds, "Following IDs");
    
            const delta = 0.10; // 
            const nearbyLocations = await locationModel.find({
                "address.lat": { $gte: targetLat - delta, $lte: targetLat + delta },
                "address.lng": { $gte: targetLng - delta, $lte: targetLng + delta }
            });
            console.log(nearbyLocations, "Nearby Location Documents");
    
            const localUserIds = nearbyLocations.map(loc => loc.user_id);
            console.log(localUserIds, "Local User IDs");
    
            const localPosts = await createPostModel.find({
                user_id: { $in: localUserIds }
            })
                .populate('user_id', 'full_Name profile_url')
                .sort({ timestamp: -1 })
                .limit(5);
            console.log(localPosts, "Local Posts");

            const selfPosts = await createPostModel.find({ user_id: user_id })
            .populate('user_id', 'full_Name profile_url')
            .sort({ timestamp: -1 })
            .limit(5);
        console.log(selfPosts, "Self Posts");

        const followedPosts = await createPostModel.find({ user_id: { $in: followingIds } })
            .populate('user_id', 'full_Name profile_url')
            .sort({ timestamp: -1 })
            .limit(5);
        console.log(followedPosts, "Followed Posts");

        const businessPosts = await businessregisterModel.find({ user_id: { $in: followingIds } })
            .sort({ timestamp: -1 })
            .limit(5);
        console.log(businessPosts, "Business Posts");

        const userPosts = await registerModel.find({ _id: user_id })
            .sort({ timestamp: -1 })
            .limit(5);
        console.log(userPosts, "User Interest Posts");

        // 8. Fetch products
        const products = await Product.find()
            .select('basicInfo.productTitle images pricing.regularPrice pricing.salePrice ratings.averageRating')
            .sort({ 'ratings.averageRating': -1 })
            .limit(5);
        console.log(products, "Products");
            const feed = [
                ...selfPosts.map(post => ({ type: 'post', data: post })),
                ...followedPosts.map(post => ({ type: 'post', data: post })),
                ...businessPosts.map(post => ({ type: 'business', data: post })),
                ...userPosts.map(post => ({ type: 'user_interest', data: post })),
                ...products.map(product => ({ type: 'product', data: product })),
                ...localPosts.map(post => ({ type: 'local', data: post }))
            ];
            console.log(feed, "Combined Feed");
    
            const sortedFeed = feed.sort((a, b) => new Date(b.data.timestamp || 0) - new Date(a.data.timestamp || 0));
    
            const shuffledFeed = sortedFeed.sort(() => Math.random() - 0.5);
            console.log(shuffledFeed, "Shuffled Feed");
    
            const transformedFeed = shuffledFeed.map(item => {
                const { data: post, type } = item;
    
                
                if (type === 'post' || type === 'business' || type === 'user_interest' || type === 'local') {
                    return {
                        id: post._id,
                        username: type === 'business'
                            ? (post.businessName || "")
                            : post.user_id?.full_Name || 'Unknown',
                        userAvatar: type === 'business'
                            ? post.brand_logo || ''
                            : post.user_id?.profile_url || '',
                        companyName: type === 'business' ? post.org_name || '' : '',
                        mediaType: type === "post" || type === "local"
                            ? (post.isVideo ? "video" : (post.mediaType || "image"))
                            : (post.mediaType || "image"),
                        mediaUrl: post.mediaUrl || '',
                        carouselUrls: post.carouselUrls || null,
                        description: post.description || '',
                        isVerified: post.isVerified || false,
                        isSponsored: post.isSponsored || false,
                        likes: post.likes || 0,
                        comments: post.comments || 0,
                        shares: post.shares || 0,
                        views: post.views || 0,
                        productTags: post.productTags || [],
                        productPrice: post.productPrice || 0.0,
                        productUrl: post.productUrl || null,
                        timePosted: post.timestamp,
                        location: post.location || '',
                        isPinned: post.isPinned || false,
                        campaignType: post.campaignType || null,
                        adMetrics: post.adMetrics || null,
                        type
                    };
                }
    
               
                if (type === 'product') {
                    return {
                        id: post._id,
                        productTitle: post.basicInfo?.productTitle || '',
                        images: post.images || [],
                        regularPrice: post.pricing?.regularPrice || 0,
                        salePrice: post.pricing?.salePrice || 0,
                        averageRating: post.ratings?.averageRating || 0,
                        type
                    };
                }
    
                return { type, ...post };
            });
    
    
            return transformedFeed;
        } catch (error) {
            console.error("Error fetching feed:", error);
            throw error;
        }
    },
    
    
    // =============================
    addDeliveryAddress: async (data) => {
        const { user_id, fullName, PhoneNumber, email, streetAddress, apartment, city, state, postalCode, country, lat, lng, deliveryInstructions } = data;
        try {
            if (!user_id || !fullName || !PhoneNumber || !email || !streetAddress || !city || !state || !postalCode || !country || !lat || !lng) {
                throw new Error("requried some field")
            }

            const addressCount = await DeliveryAddressModel.countDocuments({ user_id });

            if (addressCount >= 3) {
                throw new Error("You can only store up to 3 delivery addresses.");
            }
            const createAddress = await DeliveryAddressModel.create({
                user_id,
                fullName,
                PhoneNumber,
                email,
                streetAddress,
                apartment,
                city,
                state,
                postalCode,
                country,
                lat,
                lng,
                deliveryInstructions

            })
            return createAddress
        } catch (error) {
            console.error("Error createAddress:", error);
            throw error
        }
    },
    // ========================
    getDeliveryAddress: async (user_id) => {
        try {
            const defaultAddress= await locationModel.find(user_id)
            console.log(defaultAddress,"def")
            const getDeliveryAddress = await DeliveryAddressModel.find(user_id);
            return {
                defaultAddress,
                deliveryAddresses: getDeliveryAddress
            };
        } catch (error) {
            console.error("Error  in get DeliveryAddress:", error);
            throw error
        }
    },
    // =================
    deleteAddress:async (deliveryAddress_id) => {
        console.log("deliveryAddress_id")
        try {
            const { id } = deliveryAddress_id; // Extract ID from object
    const deleteAddress = await DeliveryAddressModel.findOneAndDelete({ _id: id.toString() });
            return deleteAddress
        } catch (error) {
            console.error("Error  in delete delivery Address:", error);
            throw error
        }
    },
    // =================

}



export default adminService;