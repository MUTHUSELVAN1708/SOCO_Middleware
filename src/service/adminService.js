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
import Playlist from "../model/playlistModel.js";
import Comment from "../model/Comment.js";
import otpModel from "../model/regOtpModel.js";
import { constants } from "buffer";
import followerModel from "../model/followerModel.js";
import CommentModel from "../model/Comment.js";
import ServiceModel from "../model/serviceModel.js";
import UserInfo from "../model/UserInfo.js";
// import postModel from "../model/postModel.js";
import createPostModel from "../model/createPostModel.js";
import levenshtein from "fast-levenshtein";
import mongoose from "mongoose";
import moment from "moment";
import cron from "node-cron";
import mentionModel from "../model/mentionModel.js";
import { connectedUsers } from "../../socket.js";
import pushnotofication from "../pushNotification.js"
import cartModel from "../model/cartModel.js";
import MessageModel from "../model/chatModel.js";
// import redisService from "./redisService.js";
import Product from "../model/Product.js";
import DeliveryAddressModel from "../model/deliveryAddressModel.js";

import Razorpay from "razorpay";
import checkoutModel from "../model/checkoutModel.js";
import invoiceModel from "../model/invoiceModel.js";
import FavoriteModel from "../model/favoriteModel.js";
import BookmarkModel from "../model/BookmarkModel.js";
import Friend from "../model/FriendModel.js";
import Follow from "../model/FollowModel.js";
import redisService from "./redisService.js";
// import Playlist from "../model/playlistModel.js";
import { v4 as uuidv4 } from "uuid";


const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_ID_KEY,
    key_secret: process.env.RAZORPAY_SECRET_KEY,
});

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
            console.log(otp, "otp")
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
                success: true, // ✅ Ensure 'success' field is always present
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


    updateNotificationDetails: async (data) => {
        try {
            const { userId, oneSignalID, subscriptionID } = data;

            if (!userId || !oneSignalID || !subscriptionID) {
                throw { status: 400, message: "User ID, OneSignal ID, and Subscription ID are required." };
            }

            let userToUpdate = await registerModel.findById(userId);
            let businessToUpdate = await businessregisterModel.findOne({ user_id: userId });
            let linkedUserId = null;
            let relatedBusinesses = []; // Declare it outside to avoid "not defined" error

            if (!userToUpdate && !businessToUpdate) {
                throw { status: 404, message: "User or Business account not found." };
            }

            if (businessToUpdate) {
                linkedUserId = businessToUpdate.user_id;

                const businessUpdateFields = {
                    oneSignalIDs: businessToUpdate.oneSignalIDs || [],
                    subscriptionIDs: businessToUpdate.subscriptionIDs || []
                };

                if (!businessUpdateFields.oneSignalIDs.includes(oneSignalID)) {
                    businessUpdateFields.oneSignalIDs.push(oneSignalID);
                }
                if (!businessUpdateFields.subscriptionIDs.includes(subscriptionID)) {
                    businessUpdateFields.subscriptionIDs.push(subscriptionID);
                }

                await businessregisterModel.findByIdAndUpdate(
                    businessToUpdate._id,
                    { $set: businessUpdateFields },
                    { new: true }
                );

                relatedBusinesses = await businessregisterModel.find({ user_id: linkedUserId });

                for (let business of relatedBusinesses) {
                    const updateFields = {
                        oneSignalIDs: business.oneSignalIDs || [],
                        subscriptionIDs: business.subscriptionIDs || []
                    };
                    if (!updateFields.oneSignalIDs.includes(oneSignalID)) {
                        updateFields.oneSignalIDs.push(oneSignalID);
                    }
                    if (!updateFields.subscriptionIDs.includes(subscriptionID)) {
                        updateFields.subscriptionIDs.push(subscriptionID);
                    }
                    await businessregisterModel.findByIdAndUpdate(
                        business._id,
                        { $set: updateFields },
                        { new: true }
                    );
                }

                userToUpdate = await registerModel.findById(linkedUserId);
            }

            if (userToUpdate) {
                const userUpdateFields = {
                    oneSignalIDs: userToUpdate.oneSignalIDs || [],
                    subscriptionIDs: userToUpdate.subscriptionIDs || []
                };
                if (!userUpdateFields.oneSignalIDs.includes(oneSignalID)) {
                    userUpdateFields.oneSignalIDs.push(oneSignalID);
                }
                if (!userUpdateFields.subscriptionIDs.includes(subscriptionID)) {
                    userUpdateFields.subscriptionIDs.push(subscriptionID);
                }
                await registerModel.findByIdAndUpdate(
                    userToUpdate._id,
                    { $set: userUpdateFields },
                    { new: true }
                );
            }

            return {
                success: true,
                updatedUser: userToUpdate,
                updatedBusiness: businessToUpdate,
                updatedRelatedBusinesses: relatedBusinesses.length
            };
        } catch (error) {
            console.error("Error in updateNotificationDetails:", error);
            throw { status: error.status || 500, message: error.message || "Internal Server Error" };
        }
    },

    //   ==========
    registerUserWithBusiness: async (data) => {
        try {
            const {
                full_Name,
                phn_number,
                email,
                languages,
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
                achievements,
                businessLat,
                businessLng,
                businessDescription,
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
                languages,
                lat: address['lat'],
                lng: address['lng'],
                city: address['city'],
                district: address['district'],
                state: address['state'],
                pinCode: address['Pincode'],
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
                lat: businessLat || "",
                lng: businessLng || "",
                description: businessDescription || "",
                important,

                // Chat-related fields
                onlineStatus,
                isTyping,
                lastOnline,
                currentChatRoom,
                unreadMessagesCount,
            });

            if (natureOfBusiness) {
                const service = await ServiceModel.findOne({ name: natureOfBusiness });
                if (service) {
                    service.userCount += 1;
                    await service.save();
                } else {
                    await ServiceModel.create({
                        name: natureOfBusiness,
                        description: type_of_service || "",
                        iconUrl: brand_logo || "",
                        category: category || "General",
                        userCount: 1,
                        isPopular: false,
                        rating: 0
                    });
                }
            }



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
                languages,
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
                languages,
                lat: address['lat'],
                lng: address['lng'],
                city: address['city'],
                district: address['district'],
                state: address['state'],
                pinCode: address['Pincode'],
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

    addAccessIdToBusinessAccount: async (data) => {
        try {
            const { id, includeId } = data;
            if (!id || !includeId) {
                throw { status: 400, message: "Business ID and Include ID are required." };
            }

            const businessAccount = await businessregisterModel.findById(id);
            if (!businessAccount) {
                throw { status: 404, message: "Business account not found." };
            }

            if (!businessAccount.accessAccountsIds.includes(includeId)) {
                businessAccount.accessAccountsIds.push(includeId);
                await businessAccount.save();
            }

            return { success: true, business: businessAccount };
        } catch (error) {
            console.error("Error in AddAccessIdToBusinessAccount:", error);
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
                businessLat,
                businessLng,
                businessDescription,
                accessAccountsIds = [] // New field for additional linked accounts
            } = data;

            let errors = [];

            if (!user_id) errors.push("User ID is required.");
            if (!businessName) errors.push("Business name is required.");
            if (!businessType) errors.push("Business type is required.");
            if (!natureOfBusiness) errors.push("Nature of business is required.");

            if (errors.length > 0) {
                throw { status: 400, message: errors.join(" ") };
            }

            // Check if the main user exists
            const existingUser = await registerModel.findById(user_id);
            if (!existingUser) {
                throw { status: 404, message: "User not found for the given user ID in business profile." };
            }

            // Validate accessAccountsIds if provided
            if (accessAccountsIds.length > 0) {
                const validAccounts = await registerModel.find({ _id: { $in: accessAccountsIds } });
                if (validAccounts.length !== accessAccountsIds.length) {
                    throw { status: 400, message: "One or more access account IDs are invalid." };
                }
            }

            // Ensure business name is unique
            const existingBusiness = await businessregisterModel.findOne({ businessName });
            if (existingBusiness) {
                throw { status: 400, message: "Business name already exists. Business name must be unique." };
            }

            // Create the business
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
                lat: businessLat || "",
                lng: businessLng || "",
                description: businessDescription || "",
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
                accessAccountsIds // Store linked account IDs
            });

            if (natureOfBusiness) {
                const service = await ServiceModel.findOne({ name: natureOfBusiness });
                if (service) {
                    service.userCount += 1;
                    await service.save();
                } else {
                    await ServiceModel.create({
                        name: natureOfBusiness,
                        description: type_of_service || "",
                        iconUrl: brand_logo || "",
                        category: category || "General",
                        userCount: 1,
                        isPopular: false,
                        rating: 0
                    });
                }
            }

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

            // Fetch businesses where the user is the owner
            const ownedBusinesses = await businessregisterModel.find({ user_id: user._id });

            // Fetch businesses where the user has access via accessAccountsIds
            const accessibleBusinesses = await businessregisterModel.find({ accessAccountsIds: user._id.toString() });

            // Merge and remove duplicates
            const allBusinesses = [...ownedBusinesses, ...accessibleBusinesses].filter(
                (business, index, self) =>
                    index === self.findIndex((b) => b._id.toString() === business._id.toString())
            );

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
                    business: allBusinesses.length > 0 ? allBusinesses : [],
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

    getMyAccounts: async (userId) => {
        try {
            const user = await registerModel.findById(userId);
            if (!user) {
                throw { msg: "User not found." };
            }

            const ownedBusinesses = await businessregisterModel.find({ user_id: user._id });

            const accessibleBusinesses = await businessregisterModel.find({
                accessAccountsIds: user._id.toString()
            });

            const allBusinesses = [...ownedBusinesses, ...accessibleBusinesses].filter(
                (business, index, self) =>
                    index === self.findIndex(b => b._id.toString() === business._id.toString())
            );

            return {
                status: 200,
                msg: "Accounts fetched successfully",
                login: {
                    token: null,
                    user,
                    business: allBusinesses,
                },
            };
        } catch (error) {
            console.error("Service error in getMyAccounts:", error);
            return {
                status: 500,
                msg: error.msg || "Failed to retrieve accounts. Please try again.",
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
            const random = Math.random().toString(36).slice(2, 8);
            console.log(random, "kkk");
            const sendmail = await adminService.sendMail(email, random)
            console.log(sendmail, "sendmail")
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

    // ======================
    sendMail: async (email, code) => {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your Email Verification Code",
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background-color: #0066cc; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Verify Your Email</h1>
    </div>
    
    <div style="padding: 20px; background-color: #ffffff;">
        <h2 style="color: #333333;">Welcome to Soco</h2>
        
        <p>Dear User,</p>
        
        <p>You recently requested to reset your password for your Soco account. To proceed, please enter the verification code below:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; text-align: center; border-radius: 5px;">
            <h2 style="color: #0066cc; margin: 0;">Your Verification Code</h2>
            <div style="font-size: 32px; font-weight: bold; color: #333333; margin: 10px 0;">${code}</div>
        </div>
        


        <p style="color: #666666; font-size: 12px; margin-top: 20px;">For security reasons, please do not share this code with anyone. If you need assistance, feel free to contact our support team.</p>
    </div>
    
    <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
        <p style="margin: 0; color: #666666;">
            Stay connected with us:
            <a href="#" style="color: #0066cc; text-decoration: none;">LinkedIn</a> |
            <a href="#" style="color: #0066cc; text-decoration: none;">Twitter</a> |
            <a href="#" style="color: #0066cc; text-decoration: none;">Instagram</a>
        </p>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #666666;">
            Soco | 800 Broadway Suite 1500, New York, NY 000423, USA | Support: 0800 000 900
        </p>
        <p style="font-size: 12px; color: #666666;">
            © ${new Date().getFullYear()} Soco. All rights reserved.
        </p>
    </div>
</div>
 `,
        };
        try {
            await transporter.sendMail(mailOptions);
            console.log(`Email sent to ${email} with code: ${code}`);
        } catch (error) {
            console.error("Error sending email:", error);
            throw new Error("Failed to send email");
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

            const normalizedQuery = query.toLowerCase().trim();
            let results = [];

            // Function to calculate relevance score based on match quality
            const calculateScore = (fieldValue, query) => {
                if (!fieldValue) return 0;
                const value = fieldValue.toString().toLowerCase();

                // Exact match gets highest score
                if (value === query) return 20;
                // Starts with query gets high score
                if (value.startsWith(query)) return 15;
                // Contains query as a whole word gets medium score
                if (new RegExp(`\\b${query}\\b`).test(value)) return 12;
                // Contains query gets lower score
                if (value.includes(query)) return 10;
                // Partial match gets lowest score
                return 5;
            };

            if (typeOfSearch === "Location") {
                // Location search for users
                const locationQuery = {
                    $or: [
                        { 'address.street': { $regex: normalizedQuery, $options: 'i' } },
                        { 'address.city': { $regex: normalizedQuery, $options: 'i' } },
                        { 'address.district': { $regex: normalizedQuery, $options: 'i' } },
                        { 'address.country': { $regex: normalizedQuery, $options: 'i' } }
                    ]
                };

                // If the query is a number, add a condition for Pincode
                if (!isNaN(query)) {
                    locationQuery.$or.push({ 'address.Pincode': Number(query) });
                }

                // Get all matching locations
                const locationResults = await locationModel.find(locationQuery)
                    .select('_id address lat lng');

                // Extract user data based on location IDs
                if (locationResults.length > 0) {
                    const locationIds = locationResults.map(location => location._id);
                    const locationMap = new Map(locationResults.map(loc => [loc._id.toString(), loc]));

                    const userResults = await registerModel.find({
                        location_id: { $in: locationIds }
                    }).select('_id full_Name profile_url location_id');

                    // Format user results with location data
                    const formattedUserResults = userResults.map(user => {
                        const locationData = locationMap.get(user.location_id.toString()) || {};
                        const addressText = locationData.address ?
                            [
                                locationData.address.street,
                                locationData.address.city,
                                locationData.address.district,
                                locationData.address.country,
                                locationData.address.Pincode
                            ].filter(Boolean).join(', ') : '';

                        // Calculate score based on how well the location matches the query
                        let score = 0;
                        if (locationData.address) {
                            score += calculateScore(locationData.address.street, normalizedQuery);
                            score += calculateScore(locationData.address.city, normalizedQuery);
                            score += calculateScore(locationData.address.district, normalizedQuery);
                            score += calculateScore(locationData.address.country, normalizedQuery);
                            if (locationData.address.Pincode) {
                                score += calculateScore(locationData.address.Pincode.toString(), normalizedQuery);
                            }
                        }

                        return {
                            _id: user._id,
                            full_Name: user.full_Name,
                            type: "User",
                            profile_url: user.profile_url || "",
                            address: addressText,
                            lat: locationData.lat || "",
                            lng: locationData.lng || "",
                            score: score
                        };
                    });

                    results = [...results, ...formattedUserResults];
                }

                // Business location search
                const businessQuery = {
                    $or: [
                        { businessAddress: { $regex: normalizedQuery, $options: 'i' } },
                        { businessCity: { $regex: normalizedQuery, $options: 'i' } },
                        { businessState: { $regex: normalizedQuery, $options: 'i' } },
                        { businessCountry: { $regex: normalizedQuery, $options: 'i' } }
                    ]
                };

                if (!isNaN(query)) {
                    businessQuery.$or.push({ businessPinCode: Number(query) });
                }

                const businessResults = await businessregisterModel.find(businessQuery)
                    .select('_id businessName brand_logo businessAddress businessCity businessState businessCountry businessPinCode lat lng');

                // Format business results
                const formattedBusinessResults = businessResults.map(business => {
                    const addressText = [
                        business.businessAddress,
                        business.businessCity,
                        business.businessState,
                        business.businessCountry,
                        business.businessPinCode
                    ].filter(Boolean).join(', ');

                    // Calculate score based on how well the location matches the query
                    let score = 0;
                    score += calculateScore(business.businessAddress, normalizedQuery);
                    score += calculateScore(business.businessCity, normalizedQuery);
                    score += calculateScore(business.businessState, normalizedQuery);
                    score += calculateScore(business.businessCountry, normalizedQuery);
                    if (business.businessPinCode) {
                        score += calculateScore(business.businessPinCode.toString(), normalizedQuery);
                    }

                    return {
                        _id: business._id,
                        businessName: business.businessName,
                        type: "Business",
                        profile_url: business.brand_logo || "",
                        address: addressText,
                        lat: business.lat || "",
                        lng: business.lng || "",
                        score: score
                    };
                });

                results = [...results, ...formattedBusinessResults];
            }
            else if (typeOfSearch === "Name") {
                // User name search - improved to include fuzzy matching
                const userResults = await registerModel.aggregate([
                    {
                        $match: { full_Name: { $regex: normalizedQuery, $options: 'i' } }
                    },
                    {
                        $lookup: {
                            from: 'locations',
                            localField: 'location_id',
                            foreignField: '_id',
                            as: 'locationData'
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            full_Name: 1,
                            profile_url: 1,
                            lat: { $arrayElemAt: ['$locationData.lat', 0] },
                            lng: { $arrayElemAt: ['$locationData.lng', 0] },
                            address: {
                                $concat: [
                                    { $arrayElemAt: ['$locationData.address.street', 0] }, ', ',
                                    { $arrayElemAt: ['$locationData.address.city', 0] }, ', ',
                                    { $arrayElemAt: ['$locationData.address.district', 0] }, ', ',
                                    { $arrayElemAt: ['$locationData.address.country', 0] }
                                ]
                            }
                        }
                    }
                ]);

                // Calculate score based on name match quality
                const formattedUserResults = userResults.map(user => ({
                    _id: user._id,
                    full_Name: user.full_Name,
                    type: "User",
                    profile_url: user.profile_url || "",
                    address: user.address || "",
                    lat: user.lat || "",
                    lng: user.lng || "",
                    score: calculateScore(user.full_Name, normalizedQuery)
                }));

                // Business name search
                const businessResults = await businessregisterModel.find({
                    businessName: { $regex: normalizedQuery, $options: 'i' }
                }).select('_id businessName brand_logo businessAddress businessCity businessState businessCountry businessPinCode lat lng');

                const formattedBusinessResults = businessResults.map(business => {
                    const addressText = [
                        business.businessAddress,
                        business.businessCity,
                        business.businessState,
                        business.businessCountry,
                        business.businessPinCode
                    ].filter(Boolean).join(', ');

                    return {
                        _id: business._id,
                        businessName: business.businessName,
                        type: "Business",
                        profile_url: business.brand_logo || "",
                        address: addressText,
                        lat: business.lat || "",
                        lng: business.lng || "",
                        score: calculateScore(business.businessName, normalizedQuery)
                    };
                });

                results = [...formattedUserResults, ...formattedBusinessResults];
            }
            // Add a new search type for proximity search (if lat/lng provided)
            else if (typeOfSearch === "Proximity") {
                // Extract user's lat and lng from the query string (format: "lat,lng,radius")
                const [userLat, userLng, radiusKm = 10] = normalizedQuery.split(',').map(Number);

                if (isNaN(userLat) || isNaN(userLng)) {
                    return { success: false, message: "Invalid coordinates format. Use 'latitude,longitude' or 'latitude,longitude,radiusKm'" };
                }

                // Convert radius from km to radians (for MongoDB's $geoNear)
                const radiusInRadians = radiusKm / 6371; // Earth radius in km

                // Find users within the radius
                const nearbyLocations = await locationModel.find({
                    lat: { $exists: true },
                    lng: { $exists: true },
                    $where: function () {
                        if (!this.lat || !this.lng) return false;

                        const lat1 = parseFloat(this.lat);
                        const lng1 = parseFloat(this.lng);
                        const lat2 = userLat;
                        const lng2 = userLng;

                        if (isNaN(lat1) || isNaN(lng1)) return false;

                        // Haversine formula
                        const dLat = (lat2 - lat1) * Math.PI / 180;
                        const dLon = (lng2 - lng1) * Math.PI / 180;
                        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                            Math.sin(dLon / 2) * Math.sin(dLon / 2);
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                        const distance = 6371 * c; // Distance in km

                        return distance <= radiusKm;
                    }
                }).select('_id address lat lng');

                // Process user results
                if (nearbyLocations.length > 0) {
                    const locationIds = nearbyLocations.map(loc => loc._id);
                    const locationMap = new Map(nearbyLocations.map(loc => [loc._id.toString(), loc]));

                    const nearbyUsers = await registerModel.find({
                        location_id: { $in: locationIds }
                    }).select('_id full_Name profile_url location_id');

                    const formattedUserResults = nearbyUsers.map(user => {
                        const locationData = locationMap.get(user.location_id.toString()) || {};

                        // Calculate distance
                        let distance = 0;
                        if (locationData.lat && locationData.lng) {
                            const lat1 = parseFloat(locationData.lat);
                            const lng1 = parseFloat(locationData.lng);
                            const lat2 = userLat;
                            const lng2 = userLng;

                            // Haversine formula
                            const dLat = (lat2 - lat1) * Math.PI / 180;
                            const dLon = (lng2 - lng1) * Math.PI / 180;
                            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                                Math.sin(dLon / 2) * Math.sin(dLon / 2);
                            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                            distance = 6371 * c; // Distance in km
                        }

                        const addressText = locationData.address ?
                            [
                                locationData.address.street,
                                locationData.address.city,
                                locationData.address.district,
                                locationData.address.country,
                                locationData.address.Pincode
                            ].filter(Boolean).join(', ') : '';

                        return {
                            _id: user._id,
                            full_Name: user.full_Name,
                            type: "User",
                            profile_url: user.profile_url || "",
                            address: addressText,
                            lat: locationData.lat || "",
                            lng: locationData.lng || "",
                            distance: distance.toFixed(2), // Distance in km
                            score: 20 - distance // Score based on proximity (closer = higher score)
                        };
                    });

                    results = [...results, ...formattedUserResults];
                }

                // Find nearby businesses
                const nearbyBusinesses = await businessregisterModel.find({
                    lat: { $exists: true },
                    lng: { $exists: true },
                    $where: function () {
                        if (!this.lat || !this.lng) return false;

                        const lat1 = parseFloat(this.lat);
                        const lng1 = parseFloat(this.lng);
                        const lat2 = userLat;
                        const lng2 = userLng;

                        if (isNaN(lat1) || isNaN(lng1)) return false;

                        // Haversine formula
                        const dLat = (lat2 - lat1) * Math.PI / 180;
                        const dLon = (lng2 - lng1) * Math.PI / 180;
                        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                            Math.sin(dLon / 2) * Math.sin(dLon / 2);
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                        const distance = 6371 * c; // Distance in km

                        return distance <= radiusKm;
                    }
                }).select('_id businessName brand_logo businessAddress businessCity businessState businessCountry businessPinCode lat lng');

                const formattedBusinessResults = nearbyBusinesses.map(business => {
                    // Calculate distance
                    let distance = 0;
                    if (business.lat && business.lng) {
                        const lat1 = parseFloat(business.lat);
                        const lng1 = parseFloat(business.lng);
                        const lat2 = userLat;
                        const lng2 = userLng;

                        // Haversine formula
                        const dLat = (lat2 - lat1) * Math.PI / 180;
                        const dLon = (lng2 - lng1) * Math.PI / 180;
                        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                            Math.sin(dLon / 2) * Math.sin(dLon / 2);
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                        distance = 6371 * c; // Distance in km
                    }

                    const addressText = [
                        business.businessAddress,
                        business.businessCity,
                        business.businessState,
                        business.businessCountry,
                        business.businessPinCode
                    ].filter(Boolean).join(', ');

                    return {
                        _id: business._id,
                        businessName: business.businessName,
                        type: "Business",
                        profile_url: business.brand_logo || "",
                        address: addressText,
                        lat: business.lat || "",
                        lng: business.lng || "",
                        distance: distance.toFixed(2), // Distance in km
                        score: 20 - distance // Score based on proximity (closer = higher score)
                    };
                });

                results = [...results, ...formattedBusinessResults];
            }
            else {
                return { success: false, message: "Invalid typeOfSearch parameter. Use 'Name', 'Location', or 'Proximity'." };
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
            console.error("Search recommendation error:", error);
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
        try {
            const {
                user_id,
                isBusinessAccount,
                caption,
                webSiteLink,
                mediaItems = [],
                isRepost = false,
                isOwnPost = true,
                isProductPost = false,
                repostDetails = null,
            } = data;

            let user;

            // Fetch the user based on whether it is a business account or not
            if (isBusinessAccount) {
                user = await businessregisterModel.findById(user_id);
            } else {
                user = await registerModel.findById(user_id);
            }

            if (!user) {
                throw new Error("User not found");
            }

            const userName = isBusinessAccount ? user.businessName || "Business User" : user.full_Name || "User";
            const userAvatar = isBusinessAccount ? user.brand_logo || "" : user.profile_url || "";

            // Create the new post object
            const newPost = new createPostModel({
                userId: user_id,
                userName,
                userAvatar,
                caption,
                webSiteLink,
                mediaItems,
                isRepost,
                isOwnPost,
                isProductPost,
                isBusinessAccount,
                repostDetails: isRepost ? repostDetails : null,
            });

            // Save the post
            const savedPost = await newPost.save();

            // Count total posts for the user
            let totalPosts;
            if (isBusinessAccount) {
                totalPosts = await createPostModel.countDocuments({ userId: user_id });  // Count posts for business account
                await businessregisterModel.updateOne(
                    { _id: user_id },
                    { $set: { postCount: totalPosts } }  // Update the post count with the total number of posts
                );
            } else {
                totalPosts = await createPostModel.countDocuments({ userId: user_id });  // Count posts for user
                await registerModel.updateOne(
                    { _id: user_id },
                    { $set: { postCount: totalPosts } }  // Update the post count with the total number of posts
                );
            }

            return {
                success: true,
                message: "Post created successfully",
                post: savedPost,
            };
        } catch (error) {
            console.error("Error creating post:", error);
            throw new Error(`Failed to create the post: ${error.message}`);
        }
    },


    createRepost: async (data) => {
        try {
            const {
                user_id,
                isBusinessAccount,
                originalPostId,
                caption = "",
                mediaItems = []
            } = data;

            const user = isBusinessAccount
                ? await businessregisterModel.findById(user_id)
                : await registerModel.findById(user_id);

            if (!user) {
                throw new Error("User not found");
            }

            const originalPost = await createPostModel.findById(originalPostId);
            if (!originalPost) {
                throw new Error("Original post not found");
            }

            const userName = isBusinessAccount ? user.businessName || "Business User" : user.full_Name || "User";
            const userAvatar = isBusinessAccount ? user.brand_logo || "" : user.profile_url || "";

            const combinedMediaItems = [...mediaItems, ...originalPost.mediaItems];

            const repost = new createPostModel({
                userId: user_id,
                userName,
                userAvatar,
                caption,
                isRepost: true,
                isOwnPost: false,
                isProductPost: originalPost.isProductPost,
                productId: originalPost.productId,
                isBusinessAccount,
                mediaItems: combinedMediaItems,
                repostDetails: {
                    originalPostId: originalPost._id,
                    originalUserId: originalPost.userId,
                    originalUserName: originalPost.userName,
                    originalUserAvatar: originalPost.userAvatar,
                    originalCaption: originalPost.caption,
                    originalMediaItems: originalPost.mediaItems,
                }
            });

            const savedRepost = await repost.save();

            await createPostModel.updateOne(
                { _id: originalPostId },
                { $inc: { rePostCount: 1 } }
            );

            return {
                success: true,
                message: "Post reposted successfully",
                post: savedRepost,
            };
        } catch (error) {
            console.error("Error reposting post:", error);
            throw new Error(`Failed to repost: ${error.message}`);
        }
    },
    // adjust the path based on your project

    createPostByProduct: async (data) => {
        try {
            const { user_id, productId, mediaItems, caption } = data;

            const user = await businessregisterModel.findById(user_id);
            if (!user) throw new Error("Business user not found");

            const product = await Product.findById(productId);
            if (!product) throw new Error("Product not found");

            const userName = user.businessName || "Business User";
            const userAvatar = user.brand_logo || "";

            let finalMediaItems = mediaItems || [];
            let finalCaption = caption || "";

            // If mediaItems or caption are missing, derive from product
            if (!mediaItems || mediaItems.length === 0) {
                const regularPrice = parseFloat(product.pricing?.regularPrice || 0);
                const salePrice = parseFloat(product.pricing?.salePrice || regularPrice);

                let totalTaxPercentage = 0;

                if (product.pricing?.gstDetails?.gstIncluded === false) {
                    totalTaxPercentage += product.pricing.gstDetails.gstPercentage || 0;
                }

                if (Array.isArray(product.pricing?.additionalTaxes)) {
                    for (const tax of product.pricing.additionalTaxes) {
                        totalTaxPercentage += parseFloat(tax.percentage || 0);
                    }
                }

                const totalPrice = salePrice + (salePrice * totalTaxPercentage / 100);

                finalMediaItems = (product.images || []).map((imgUrl) => ({
                    url: imgUrl,
                    type: "image",
                    thumbnailUrl: imgUrl,
                    productId: product._id.toString(),
                    productName: product.basicInfo?.productTitle || "",
                    price: totalPrice.toFixed(2),
                    originalPrice: regularPrice.toFixed(2),
                    hasDiscount: !!product.pricing?.discount,
                    aspectRatio: 1,
                }));
            }

            if (!finalCaption) {
                finalCaption = product.basicInfo?.productTitle || "";
            }

            const newPost = new createPostModel({
                userId: user_id,
                userName,
                userAvatar,
                productId: productId,
                caption: finalCaption,
                webSiteLink: "",
                mediaItems: finalMediaItems,
                isRepost: false,
                isOwnPost: false,
                isProductPost: true,
                isBusinessAccount: true,
                repostDetails: null,
            });

            const savedPost = await newPost.save();

            const totalPosts = await createPostModel.countDocuments({ userId: user_id });
            await businessregisterModel.updateOne({ _id: user_id }, { $set: { postCount: totalPosts } });

            return {
                success: true,
                message: "Product post created successfully",
                post: savedPost,
            };
        } catch (error) {
            console.error("Error creating product post:", error);
            throw new Error(`Failed to create product post: ${error.message}`);
        }
    },

    returnMySearchProduct: async ({ createdBy, query }) => {
        try {
            const searchCriteria = {
                createdBy
            };

            if (query && query.trim()) {
                const regex = new RegExp(query.trim(), 'i');
                searchCriteria.$or = [
                    { 'basicInfo.productTitle': regex },
                    { 'basicInfo.tags': regex },
                    { 'basicInfo.brand': regex }
                ];
            }

            const products = await Product.find(searchCriteria)
                .sort(query ? {} : { createdAt: -1 })
                .limit(15);

            return products.map((product) => {
                const regular = parseFloat(product.pricing?.regularPrice || 0);
                const sale = parseFloat(product.pricing?.salePrice || regular);
                const discount = product.pricing?.discount || (
                    regular && sale && regular > sale
                        ? Math.round(((regular - sale) / regular) * 100)
                        : 0
                );

                return {
                    id: product._id.toString(),
                    name: product.basicInfo?.productTitle || '',
                    price: sale,
                    description: product.descriptionHighlights?.description || '',
                    discount,
                    imageUrl: product.images?.[0] || ''
                };
            });
        } catch (error) {
            console.error("Error in returnMySearchProduct:", error);
            throw new Error("Failed to fetch products");
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

            const totalResults = await createPostModel.countDocuments({ userId: user_id, Product_status: { $ne: "Deactivate" } });
            console.log(totalResults, "totalResults")
            const totalPages = Math.ceil(totalResults / limit);

            const posts = await createPostModel.find({ userId: user_id, Product_status: { $ne: "Deactivate" } })
                .sort({ likesCount: -1 })
                .skip(skip)
                .limit(limit);

            let objectId;
            if (mongoose.Types.ObjectId.isValid(user_id)) {
                objectId = new mongoose.Types.ObjectId(user_id);
            }

            const favoritePosts = objectId
                ? await FavoriteModel.find({ user_id: objectId }).select("post_id")
                : [];
            const bookmarkedPosts = objectId
                ? await BookmarkModel.find({ user_id: objectId }).select("post_id")
                : [];

            const favoriteSet = new Set(favoritePosts.map(f => f.post_id.toString()));
            const bookmarkSet = new Set(bookmarkedPosts.map(b => b.post_id.toString()));

            const formattedPosts = await Promise.all(
                posts.map(async (post) => {
                    const isFavorite = favoriteSet.has(post._id.toString());
                    const isBookmarked = bookmarkSet.has(post._id.toString());

                    let topComments = await CommentModel.find({ postId: post._id })
                        .sort({ likesCount: -1, createdAt: -1 })
                        .limit(2)
                        .lean();

                    if (!topComments.length) {
                        topComments = await CommentModel.find({ postId: post._id })
                            .sort({ createdAt: -1 })
                            .limit(2)
                            .lean();
                    }

                    const formattedComments = await Promise.all(
                        topComments.map(async (comment) => {
                            const user = await UserInfo.findOne({ id: comment.userId });
                            return {
                                commentId: comment._id.toString(),
                                id: comment._id.toString(),
                                content: comment.content,
                                createdAt: comment.createdAt,
                                userInfo: {
                                    name: user?.name || "",
                                    avatar: user?.avatarUrl || "",
                                },
                            };
                        })
                    );

                    return {
                        id: post._id.toString(),
                        username: post.userName,
                        userAvatar: post.userAvatar,
                        caption: post.caption,
                        thumbnailUrl: post.thumbnailUrl,
                        likesCount: post.likesCount,
                        commentsCount: post.commentsCount,
                        viewsCount: post.viewsCount,
                        sharesCount: post.sharesCount,
                        rePostCount: post.rePostCount,
                        userId: post.userId,
                        productId: post.productId,
                        isBusinessAccount: post.isBusinessAccount,
                        isRepost: post.isRepost,
                        isOwnPost: post.isOwnPost,
                        isProductPost: post.isProductPost,
                        mediaItems: post.mediaItems.map(media => ({
                            url: media.url,
                            type: media.type,
                            thumbnailUrl: media.thumbnailUrl,
                            productName: media.productName,
                            price: media.price,
                            originalPrice: media.originalPrice,
                            hasDiscount: media.hasDiscount,
                        })),
                        repostDetails: post.repostDetails ? {
                            originalPostId: post.repostDetails.originalPostId?.toString() || "",
                            originalUserId: post.repostDetails.originalUserId || "",
                            originalUserName: post.repostDetails.originalUserName || "",
                            originalUserAvatar: post.repostDetails.originalUserAvatar || "",
                            originalCaption: post.repostDetails.originalCaption || "",
                            originalMediaItems: (post.repostDetails.originalMediaItems || []).map(media => ({
                                url: media.url,
                                type: media.type,
                                thumbnailUrl: media.thumbnailUrl,
                                productName: media.productName,
                                price: media.price,
                                originalPrice: media.originalPrice,
                                hasDiscount: media.hasDiscount,
                            })),
                        } : null,
                        likes: post.likesCount,
                        comments: formattedComments,
                        timestamp: post.timestamp,
                        isFavorite,
                        isBookmarked,
                    };
                })
            );

            return {
                posts: formattedPosts,
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



    // getPosts: async (userId, page = 1, limit = 25) => {
    //     try {
    //         const skip = (page - 1) * limit;

    //         const query = { userId, isProductPost: false };

    //         const posts = await createPostModel.find(query)
    //             .sort({ likesCount: -1 })
    //             .skip(skip)
    //             .limit(limit)
    //             .select('mediaItems likesCount caption timestamp viewsCount isProductPost');

    //         const totalResults = await createPostModel.countDocuments(query);
    //         const totalPages = Math.ceil(totalResults / limit);

    //         return {
    //             posts,
    //             pagination: {
    //                 totalResults,
    //                 totalPages,
    //                 currentPage: page,
    //                 limit,
    //                 hasNextPage: page < totalPages,
    //                 hasPreviousPage: page > 1,
    //             },
    //         };
    //     } catch (error) {
    //         throw new Error(error.message || 'Failed to fetch posts');
    //     }
    // },


    getPostDetails: async (postId) => {
        try {
            console.log(postId);

            // Fetch post details
            const post = await createPostModel.findById(postId).select(
                "user_id creatorName creatorProfileImageUrl mediaFile thumbnailFile videoDuration aspectRatio isVideo likesCount commentsCount viewsCount sharesCount isBusinessPost caption timestamp isBusinessPost description"
            );
            if (!post) throw new Error("Post not found");

            // // Fetch user details
            // const user = post.isBusinessPost
            //     ? await businessregisterModel.findById(post.user_id)
            //     : await registerModel.findById(post.user_id);

            // if (!user) throw new Error("User not found");

            // Fetch total comments count
            const totalComments = await Comment.countDocuments({ postId });

            // Fetch top 3 most popular comments based on likesCount
            const comments = await Comment.find({ postId })
                .sort({ likesCount: -1 })
                .limit(3)
                .populate({
                    path: "userInfo",
                    select: "name avatarUrl",
                })
                .select("commentId userId content createdAt likesCount replyCount hasMoreReplies");

            // Format comments
            const formattedComments = comments.map(comment => ({
                id: comment.commentId,
                userId: comment.userId,
                userName: comment.userInfo?.name || "Unknown",
                userAvatar: comment.userInfo?.avatarUrl || "",
                text: comment.content,
                createdAt: comment.createdAt,
                likesCount: comment.likesCount,
                replyCount: comment.replyCount,
                hasMoreReplies: comment.hasMoreReplies,
            }));

            return {
                id: post._id,
                user_id: post.user_id,
                creatorName: post.creatorName,
                creatorProfileImageUrl: post.creatorProfileImageUrl,
                mediaFile: post.mediaFile,
                thumbnailFile: post.thumbnailFile,
                videoDuration: post.videoDuration,
                description: post.description,
                aspectRatio: post.aspectRatio,
                isVideo: post.isVideo,
                likesCount: post.likesCount,
                commentsCount: post.commentsCount,
                totalComments: totalComments, // Added total comments count
                viewsCount: post.viewsCount,
                sharesCount: post.sharesCount,
                isBusinessPost: post.isBusinessPost,
                caption: post.caption,
                createdAt: post.timestamp,
                isLiked: false,
                isPinned: false,
                comments: formattedComments,
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
        } = data;

        try {
            const user = await registerModel.findById(user_id);
            if (!user) {
                throw new Error("User not found");
            }

            const product = await Product.findById(product_id);
            console.log(product, "product");
            if (!product) {
                throw new Error("Product not found");
            }

            if (quantity <= 0) {
                throw new Error("Invalid initial quantity");
            }

            const salePrice = Number(product?.pricing?.salePrice);
            if (isNaN(salePrice)) {
                throw new Error("Sale price is invalid or missing");
            }

            let cartItem = await cartModel.findOne({ user_id, product_id });

            if (cartItem) {
                cartItem.quantity += Number(quantity);
                cartItem.unit = unit;
                cartItem.productName = productName || product.productName;
                cartItem.size = size || product.size;
                cartItem.images = images || product.images;
                cartItem.category = category || product.category;
                cartItem.discount = product.pricing?.discount;
                cartItem.originalPrice = product.pricing?.regularPrice;
                cartItem.gst = product.pricing?.gstDetails?.gstPercentage;
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
                    price: salePrice,
                    colors: colors || product.colors,
                    gst: product.pricing.gstDetails.gstPercentage,
                    discount: product.pricing?.discount,
                    originalPrice: product.pricing?.regularPrice,
                });
            }

            let totalPrice = 0;
            if (unit === "gram" || unit === "piece") {
                totalPrice = cartItem.quantity * cartItem.price;
            } else {
                throw new Error("Invalid unit specified");
            }

            cartItem.price = totalPrice;
            await cartItem.save();

            return cartItem;
        } catch (error) {
            console.error("Error storing in cart:", error);
            throw { error: "Something went wrong" };
        }
    },
    // =================
    updateCart: async (data) => {
        try {
            if (Array.isArray(data)) {
                // Bulk update for multiple cart items
                const bulkOps = await Promise.all(
                    data.map(async (item) => {
                        const product = await Product.findById(item.product_id);
                        if (!product) {
                            throw { error: `Product with ID ${item.product_id} not found` };
                        }
                        // const productPrice = product.pricing.salePrice || product.pricing.regularPrice;
                        // const totalPrice = Number(item.quantity) * Number(productPrice); // Update total price

                        return {
                            updateOne: {
                                filter: { _id: item.cart_id, user_id: item.user_id },
                                update: {
                                    $set: {
                                        quantity: Number(item.quantity),
                                        // price: totalPrice, // Adjusted price based on new quantity
                                    },
                                },
                            },
                        };
                    })
                );

                const result = await cartModel.bulkWrite(bulkOps);
                console.log(result, "pouuu")
                if (result.matchedCount === 0) {
                    throw { error: "No matching documents found" };
                }

                // Fetch the updated documents
                const updatedDocuments = await cartModel.find({
                    _id: { $in: data.map((item) => item.cart_id) },
                    user_id: { $in: data.map((item) => item.user_id) },
                });
                return updatedDocuments;
            } else {
                // Single update
                const { cart_id, product_id, user_id, quantity } = data;

                const product = await Product.findById(product_id);
                if (!product) {
                    throw { error: "Product not found" };
                }
                console.log("000000")
                const productPrice = product.pricing.salePrice;
                // const totalPrice = Number(quantity) * Number(productPrice); // Adjust total price

                // Update the cart with the correct price
                const updatedCart = await cartModel.findOneAndUpdate(
                    { _id: cart_id, user_id },
                    {
                        quantity: Number(quantity),
                        // price: totalPrice, // Adjusted price based on new quantity
                    },
                    { new: true }
                );

                if (!updatedCart) {
                    throw { error: "User or Cart ID not found" };
                }
                return updatedCart;
            }
        } catch (error) {
            console.error("Error updating cart:", error);
            throw error;
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
            console.log("Fetching cart for user:", user_id);

            const getCart = await cartModel.find({ user_id });

            return getCart;
        } catch (error) {
            console.error("Error fetching cart:", error.message);

            throw error;
        }
    },

    // ================================

   sendMessage: async (io, socket, from, to, message) => {
        // console.log("Input data:", { from, to, message });

        if (!from || !to || !message) {
            socket.emit("sendedMsg", { success: false, message: "Missing required fields: from, to, or message" });
            throw new Error("Missing required fields: from, to, or message");
        }

        const timestamp = new Date();
        const chatKey = `chat:${from}:${to}`;

        try {
            const participants = [from, to].sort();

            const newMessage = await MessageModel.findOneAndUpdate(
                { participants },
                {
                    $push: {
                        messages: { message, timestamp, sender: from }
                    },
                    $setOnInsert: {
                        participants
                    }
                },
                {
                    new: true,
                    upsert: true,
                    setDefaultsOnInsert: true
                }
            );

            console.log(" New message created:", newMessage);
            const latestMessage = newMessage.messages.at(-1);

            const messageWithObjectId = {
                chat_id: newMessage._id.toString(),
                _id: latestMessage._id,
                from,
                to,
                message: latestMessage.message,
                timestamp: latestMessage.timestamp
            };
            // Store message in Redis
            await redisService.getRedisClient().lPush(chatKey, JSON.stringify(messageWithObjectId));

            // console.log("Checking connected users:", JSON.stringify(connectedUsers, null, 2));
            const receiverSocketId = connectedUsers[to];

            if (receiverSocketId) {
                // console.log(`✅ Receiver (${to}) is online. Sending message...`);
                io.to(receiverSocketId).emit("receiveMsg", messageWithObjectId);
            } else {
                // console.log(`❌ Receiver (${to}) is offline.`);
                await redisService.getRedisClient().lPush(`offlineMessages:${to}`, JSON.stringify(messageWithObjectId));
            }

            socket.emit("sendedMsg", { success: true, data: messageWithObjectId });

            return { success: true, message: "Message sent",messageWithObjectId };
        } catch (err) {
            // console.error("❌ Error in sendMessage:", err);
            socket.emit("sendedMsg", { success: false, message: "Error sending message" });
            throw new Error("Error sending message");
        }
    },





    //   =============
    getChatHistory: async (from, to) => {
        const chatKey1 = `chat:${from}:${to}`;
        const chatKey2 = `chat:${to}:${from}`;
console.log(chatKey1,chatKey2,"chatKey1")
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

    // ========================


getAllChatUser: async (user_id) => {
    try {
        let getuser = await registerModel.findOne({ _id: user_id });
        if (!getuser) getuser = await businessregisterModel.findOne({ _id: user_id });
        if (!getuser) throw new Error("User not found");

        const chats = await MessageModel.find({ participants: user_id });
        const result = [];

        for (const chat of chats) {
            const otherUserId = chat.participants.find(id => id !== user_id);

            let otherUser = await registerModel.findOne({ _id: otherUserId }, 'full_Name profile_url');
            if (!otherUser) {
                otherUser = await businessregisterModel.findOne({ _id: otherUserId }, 'businessName brand_logo');
            }

            const lastMessage = chat.messages[chat.messages.length - 1];

            const name = otherUser?.full_Name || otherUser?.businessName || "Unknown";
            const profileImage = otherUser?.profile_url || otherUser?.brand_logo || null;

            result.push({
                userId: otherUserId,
                name,
                profileImage,
                lastMessage: lastMessage?.message || "",
                timestamp: lastMessage?.timestamp || null,
                isOnline: !!connectedUsers[otherUserId],
                chat_id:chat._id
            });
        }

        return result;
    } catch (error) {
        console.error(" Error in getAllChatUser:", error.message);
        throw error;
    }
},

    // =============================
    addDeliveryAddress: async (data) => {
        const {
            user_id,
            fullName,
            phoneNumber,
            email,
            streetAddress,
            apartment,
            city,
            state,
            postalCode,
            country,
            lat,
            lng,
            isDefault,
            deliveryInstructions,
            addressType = 'home', // Default value for addressType
        } = data;

        try {
            if (!user_id || !fullName || !phoneNumber || !streetAddress || !city || !state || !postalCode) {
                throw new Error("Required fields are missing.");
            }

            const addressCount = await DeliveryAddressModel.countDocuments({ user_id });

            if (addressCount >= 3) {
                throw new Error("You can only store up to 3 delivery addresses.");
            }

            // If the new address is marked as default, update other addresses to isDefault: false
            if (isDefault) {
                await DeliveryAddressModel.updateMany(
                    { user_id, isDefault: true },
                    { $set: { isDefault: false } }
                );
            }

            // Create a new delivery address
            const createAddress = await DeliveryAddressModel.create({
                user_id,
                fullName,
                phoneNumber,
                email,
                streetAddress,
                apartment,
                city,
                state,
                isDefault,
                postalCode,
                country: country || 'India',
                lat: lat || 0,
                lng: lng || 0,
                deliveryInstructions,
                addressType,
            });

            return createAddress;
        } catch (error) {
            console.error("Error in createAddress:", error);
            throw error;
        }
    },


    // ========================
    // getDeliveryAddress: async (user_id) => {
    //     try {
    //         const defaultAddress= await locationModel.find(user_id)
    //         console.log(defaultAddress,"def")
    //         const getDeliveryAddress = await DeliveryAddressModel.find(user_id);
    //         return {
    //             defaultAddress,
    //             deliveryAddresses: getDeliveryAddress
    //         };
    //     } catch (error) {
    //         console.error("Error  in get DeliveryAddress:", error);
    //         throw error
    //     }
    // },

    getDeliveryAddress: async (user_id) => {
        try {
            const deliveryAddresses = await DeliveryAddressModel.find(user_id);
            return deliveryAddresses;
        } catch (error) {
            console.error("Error in getDeliveryAddress:", error);
            throw error;
        }
    },

    // =================
    deleteAddress: async (deliveryAddress_id) => {
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

    getUserProfile: async (id, userId, accountBusinessType) => {
        try {
            console.log(`Fetching user profile for ID: ${id}`);

            // First, try to find the user in registerModel
            let user = await registerModel.findById(id);

            // If not found, try businessregisterModel
            const isBusinessAccount = !user;
            if (!user) {
                user = await businessregisterModel.findById(id);
            }

            if (!user) {
                console.log(`User not found for ID: ${id}`);
                return null;
            }

            console.log(`User found: ${user._id}, Name: ${isBusinessAccount ? user.businessName : user.full_Name}`);

            const fullName = isBusinessAccount ? user.businessName || "Business Owner" : user.full_Name || "";

            console.log(`Checking friendship status for userId: ${userId} and profileId: ${id}`);

            // Fetch friendship details
            const friendRecord = await Friend.findOne({
                userId,
                "friends.friendId": id,
                "friends.friendReference": isBusinessAccount ? "businessRegister" : "User",
            });
            const friendRecordV1 = await Friend.aggregate([
                { $match: { "friends.friendId": userId } },
                { $unwind: "$friends" },
                { $match: { "friends.friendId": userId, "friends.status": "Accepted" } },
                {
                    $project: {
                        _id: "$friends._id",
                        requesterId: "$userId",
                        status: "$friends.status",
                        friendId: "$friends.friendId",
                        friendReference: "$userReference",
                        requestedAt: "$friends.requestedAt",
                        acceptedAt: "$friends.acceptedAt"
                    }
                }
            ]);

            console.log('------ friendRecordV1 ------');
            console.log(friendRecordV1);


            let friendStatus = "Not Friends";
            if (friendRecord) {
                const friendEntry = friendRecord.friends.find(f => f.friendId === id);
                if (friendEntry) {
                    friendStatus = friendEntry.status;
                }
            }

            if (friendRecordV1.length > 0) {
                const acceptedFriend = friendRecordV1.find(f => f.requesterId === id && f.status === "Accepted");
                if (acceptedFriend) {
                    friendStatus = "Accepted";
                }
            }

            console.log(`Friendship status: ${friendStatus}`);

            console.log(`Checking follow status for userId: ${userId} and profileId: ${id}`);

            // Check if userId is already following
            const isAlreadyFollow = await Follow.exists({
                userId,
                userReference: accountBusinessType,
                followingId: id,
                followingReference: isBusinessAccount ? "businessRegister" : "User",
            });

            console.log(`Follow status: ${isAlreadyFollow ? "Already following" : "Not following"}`);

            const profileData = {
                id: user._id.toString(),
                username: `@${fullName.trim() || (isBusinessAccount ? `Business${id}` : `User${id}`)}`,
                fullName,
                bio: isBusinessAccount ? user.natureOfBusiness || "This is a business account" : user.bio || "No bio",
                profileImageUrl: isBusinessAccount ? user.brand_logo || "" : user.profile_url || "",
                posts: user.postCount || 0,
                followers: user.followerCount || 0,
                following: user.followingCount || 0,
                friendCount: user.friendCount || 0,
                isVerified: user.isVerified || false,
                isPrivate: user.accountIsPublic === undefined ? false : !user.accountIsPublic,
                needPermissionForFollowing: user.needPermissionForFollowing,
                highlights: user.highlights?.length ? user.highlights : [],
                isAlreadyFollow: !!isAlreadyFollow,
                isBusinessAccount,
                friendStatus, // ✅ Added friend status
            };

            console.log(`Returning profile data:`, profileData);

            return profileData;
        } catch (error) {
            console.error("Error fetching user profile:", error);
            return null;
        }
    },





    fetchUserFriends: async (id) => {
        try {
            const totalFriendsCount = await followerModel.countDocuments({ user_id: id, status: 'accepted' });

            const friends = await followerModel
                .find({ user_id: id, status: 'accepted' })
                .limit(10);

            const friendDetails = await Promise.all(
                friends.map(async (friend) => {
                    const isBusinessAccount = friend.isBusinessAccount;
                    const user = isBusinessAccount
                        ? await businessregisterModel.findById(friend.follower_id)
                        : await registerModel.findById(friend.follower_id);

                    if (!user) return null;

                    return {
                        id: user._id.toString(),
                        username: `@${isBusinessAccount ? user.businessName || `Business${user._id}` : user.full_Name || `User${user._id}`}`,
                        profileImageUrl: isBusinessAccount ? user.brand_logo || '' : user.profile_url || '',
                        isFollowing: true,
                    };
                })
            );

            return {
                friends: friendDetails.filter(Boolean), // Remove null values if user was not found
                hasMoreFriends: totalFriendsCount > 10,
                totalFriendsCount,
            };
        } catch (error) {
            console.error("Error fetching user friends:", error);
            return {
                friends: [],
                hasMoreFriends: false,
                totalFriendsCount: 0,
            };
        }
    },


    fetchUserPosts: async (userId, page = 1, limit = 12) => {
        try {
            const skip = (page - 1) * limit;
            const objectId = new mongoose.Types.ObjectId(userId);

            const totalPostsCount = await createPostModel.countDocuments({ userId, Product_status: { $ne: "Deactivate" } });

            const posts = await createPostModel
                .find({ userId, Product_status: { $ne: "Deactivate" } })
                .sort({ likesCount: -1, commentsCount: -1, timestamp: -1 })
                .skip(skip)
                .limit(limit);
            console.log(posts, "posts")
            const favoritePosts = await FavoriteModel.find({ user_id: objectId }).select("post_id");
            const bookmarkedPosts = await BookmarkModel.find({ user_id: objectId }).select("post_id");

            // Filter only active favorite posts
            const favoritePostIds = favoritePosts.map((f) => f.post_id);
            const activeFavoritePosts = await createPostModel.find({
                _id: { $in: favoritePostIds },
                Product_status: { $ne: "Deactivate" }
            }).select("_id");
            const activeFavoriteSet = new Set(activeFavoritePosts.map((p) => p._id.toString()));

            // Filter only active bookmarked posts
            const bookmarkedPostIds = bookmarkedPosts.map((b) => b.post_id);
            const activeBookmarkedPosts = await createPostModel.find({
                _id: { $in: bookmarkedPostIds },
                Product_status: { $ne: "Deactivate" }
            }).select("_id");
            const activeBookmarkSet = new Set(activeBookmarkedPosts.map((p) => p._id.toString()));

            // Format posts
            const formattedPosts = await Promise.all(
                posts.map(async (post) => {
                    const isFavorite = activeFavoriteSet.has(post._id.toString());
                    const isBookmarked = activeBookmarkSet.has(post._id.toString());

                    // Get top comments
                    let topComments = await CommentModel.find({ postId: post._id })
                        .sort({ likesCount: -1, createdAt: -1 })
                        .limit(2)
                        .lean();

                    if (!topComments.length) {
                        topComments = await CommentModel.find({ postId: post._id })
                            .sort({ createdAt: -1 })
                            .limit(2)
                            .lean();
                    }

                    const formattedComments = await Promise.all(
                        topComments.map(async (comment) => {
                            const user = await UserInfo.findOne({ id: comment.userId });
                            return {
                                commentId: comment._id.toString(),
                                id: comment._id.toString(),
                                content: comment.content,
                                createdAt: comment.createdAt,
                                userInfo: {
                                    name: user?.name || "",
                                    avatar: user?.avatarUrl || "",
                                },
                            };
                        })
                    );

                    return {
                        id: post._id.toString(),
                        username: post.userName,
                        userAvatar: post.userAvatar,
                        caption: post.caption,
                        thumbnailUrl: post.thumbnailUrl,
                        likesCount: post.likesCount,
                        commentsCount: post.commentsCount,
                        viewsCount: post.viewsCount,
                        sharesCount: post.sharesCount,
                        rePostCount: post.rePostCount,
                        userId: post.userId,
                        productId: post.productId,
                        isBusinessAccount: post.isBusinessAccount,
                        isRepost: post.isRepost,
                        isOwnPost: post.isOwnPost,
                        isProductPost: post.isProductPost,
                        mediaItems: post.mediaItems.map((media) => ({
                            url: media.url,
                            type: media.type,
                            thumbnailUrl: media.thumbnailUrl,
                            productName: media.productName,
                            price: media.price,
                            originalPrice: media.originalPrice,
                            hasDiscount: media.hasDiscount,
                        })),
                        repostDetails: post.repostDetails
                            ? {
                                originalPostId: post.repostDetails.originalPostId?.toString() || "",
                                originalUserId: post.repostDetails.originalUserId || "",
                                originalUserName: post.repostDetails.originalUserName || "",
                                originalUserAvatar: post.repostDetails.originalUserAvatar || "",
                                originalCaption: post.repostDetails.originalCaption || "",
                                originalMediaItems: (post.repostDetails.originalMediaItems || []).map((media) => ({
                                    url: media.url,
                                    type: media.type,
                                    thumbnailUrl: media.thumbnailUrl,
                                    productName: media.productName,
                                    price: media.price,
                                    originalPrice: media.originalPrice,
                                    hasDiscount: media.hasDiscount,
                                })),
                            }
                            : null,
                        likes: post.likesCount,
                        comments: formattedComments,
                        timestamp: post.timestamp,
                        isFavorite,
                        isBookmarked,
                    };
                })
            );

            return {
                posts: formattedPosts,
                hasMorePosts: totalPostsCount > skip + posts.length,
                totalPostsCount,
            };
        } catch (error) {
            console.error("Error fetching user posts:", error);
            return {
                posts: [],
                hasMorePosts: false,
                totalPostsCount: 0,
            };
        }
    },





    // =======
    payment: async ({ amount, name, email }) => {
        console.log("Payment details:", amount, name, email);
        try {
            if (!amount || !name || !email) {
                return {
                    success: false,
                    msg: "All fields (amount, name, email) are required!",
                };
            }

            const options = {
                amount: amount * 100,
                currency: "INR",
                receipt: `receipt_${Date.now()}`,
            };

            const order = await razorpayInstance.orders.create(options);

            return {
                success: true,
                msg: "Order Created",
                order_id: order.id,
                amount: amount,
                // product_name: req.body.product_name,
                // description: req.body.description,
                key_id: process.env.RAZORPAY_ID_KEY,

                name: name,
                email: email,
            };
        } catch (error) {
            console.error("Error in payment processing:", error.message);
            return {
                success: false,
                msg: "Internal Server Error",
            };
        }
    },
    //   =================================
    // checkout: async (data) => {
    //     const {
    //         user_id,
    //         paymentMode,
    //         address,
    //         phone_number,
    //         amount,

    //         name,
    //         email,
    //     } = data;

    //     try {
    //         const cartItems = await cartModel.find({ user_id });
    //         if (!cartItems.length) {
    //             throw { error: "Cart is empty" };
    //         }
    //         console.log("cartItems", cartItems)
    //         let totalQuantity = 0;
    //         for (const item of cartItems) {
    //             totalQuantity += item.quantity;
    //         }
    //         console.log("totalQuantity", totalQuantity);



    //         const checkoutRecords = [];
    //         let totalPrice = 0;

    //         for (const cartItem of cartItems) {
    //             const product = await Product.findById(cartItem.product_id);
    //             if (!product) {
    //                 throw { error: `Product not found` };
    //             }
    //             console.log("pro", product);
    //             const itemTotalPrice = product.pricing?.salePrice * cartItem.quantity;
    //             totalPrice += itemTotalPrice;

    //             const payment = await adminService.payment({
    //                 amount: itemTotalPrice,
    //                 name,
    //                 email,
    //             });
    //             console.log(payment, "kkkk")
    //             if (!payment.success) {
    //                 throw { error: "Payment failed" };
    //             }
    //             const checkoutRecord = await checkoutModel.create({
    //                 user_id,
    //                 product_id: product._id,
    //                 product_img: product.images,
    //                 size: cartItem.size,
    //                 quantity: cartItem.quantity,
    //                 address,
    //                 phone_number,
    //                 paymentMode,
    //                 price: itemTotalPrice,
    //                 // razorpay_order_id:payment.razorpay_order_id,
    //                 razorpay_payment_id: payment.order_id, //razorpay_payment_id: payment.razorpay_payment_id,
    //             });

    //             checkoutRecords.push(checkoutRecord);

    //             const deleteResult = await cartModel.deleteOne({
    //                 user_id: cartItem.user_id,
    //                 product_id: cartItem.product_id,
    //             });

    //             if (deleteResult.deletedCount === 0) {
    //                 throw { error: "Failed to delete item from cart" };
    //             }
    //         }

    //         return {
    //             message: "Checkout completed successfully",
    //             checkoutRecords,
    //             totalPrice,
    //         };
    //     } catch (error) {
    //         console.error("Error during checkout:", error);
    //         throw error;
    //     }
    // },



    // ==============
    checkout: async (data) => {
        const {
            user_id,
            paymentMode,
            address,
            phone_number,
            name,
            email,
            product_id,
            quantity = 1,
            size,
        } = data;

        try {
            let checkoutRecords = [];
            let totalPrice = 0;
            let payment = null; // Store payment info

            if (product_id) {

                const product = await Product.findById(product_id);
                console.log(product, "gggggg")
                if (!product) throw { error: "Product not found" };

                const trackingNumber = `TRACK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
                const expectedDeliveryDate = product.availability?.deliveryTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days


                const itemTotalPrice = parseFloat(product.pricing?.salePrice || 0) * quantity;
                console.log(`Base Price: ${product.pricing?.salePrice}, Quantity: ${quantity}, Item Total Price: ${itemTotalPrice}`);

                let taxAmount = 0;

                // Add GST if applicable
                if (product.pricing?.gstDetails?.gstIncluded) {
                    const gstPercentage = parseFloat(product.pricing?.gstDetails?.gstPercentage || 0);
                    const gstAmount = (itemTotalPrice * gstPercentage) / 100;
                    taxAmount += gstAmount;
                    console.log(`GST Applied (${gstPercentage}%): ${gstAmount}`);
                }

                // Add additional taxes if any
                if (product.pricing?.additionalTaxes?.length > 0) {
                    product.pricing.additionalTaxes.forEach((tax) => {
                        if (tax?.percentage) {
                            const additionalTax = (itemTotalPrice * parseFloat(tax.percentage)) / 100;
                            taxAmount += additionalTax;
                            console.log(`Additional Tax (${tax.name} - ${tax.percentage}%): ${additionalTax}`);
                        }
                    });
                }

                totalPrice = itemTotalPrice + taxAmount;
                console.log(`Total Tax Amount: ${taxAmount}`);
                console.log(`Final Total Price (including taxes): ${totalPrice}`);



                if (paymentMode === "online") {
                    payment = await adminService.payment({ amount: totalPrice, name, email });
                    if (!payment.success) throw { error: "Payment failed" };
                }

                // ✅ Create Order Entry
                const checkoutRecord = await checkoutModel.create({
                    user_id,
                    product_id: product._id,
                    product_img: product.images,
                    size,
                    quantity,
                    address,
                    phone_number,
                    paymentMode,
                    price: totalPrice,
                    razorpay_payment_id: paymentMode === "online" ? payment.order_id : null,
                    tracking_number: trackingNumber,
                    courier_service: "Delhivery",
                    expected_delivery_date: expectedDeliveryDate,
                    tracking_updates: [{ status: "Pending", timestamp: new Date() }]
                });

                checkoutRecords.push(checkoutRecord);
            } else {
                // ✅ "Cart Checkout" Mode
                const cartItems = await cartModel.find({ user_id });
                if (!cartItems.length) throw { error: "Cart is empty" };

                // **Calculate total price before making payment**
                for (const cartItem of cartItems) {
                    const product = await Product.findById(cartItem.product_id);
                    if (!product) throw { error: `Product not found` };

                    totalPrice += product.pricing?.salePrice * cartItem.quantity;
                }

                // **Process payment once for the total amount**
                if (paymentMode === "online") {
                    payment = await adminService.payment({ amount: totalPrice, name, email });
                    if (!payment.success) throw { error: "Payment failed" };
                }

                // ✅ Create order entries for each item in the cart
                for (const cartItem of cartItems) {
                    const product = await Product.findById(cartItem.product_id);
                    if (!product) throw { error: `Product not found` };

                    console.log(`Processing Product: ${product._id}, Name: ${product.name}`);

                    // Base price calculation
                    const basePrice = parseFloat(product.pricing?.salePrice || 0) * cartItem.quantity;
                    console.log(`Base Price: ${product.pricing?.salePrice}, Quantity: ${cartItem.quantity}, Item Total Price: ${basePrice}`);

                    let taxAmount = 0;

                    // Add GST if applicable
                    if (product.pricing?.gstDetails?.gstIncluded) {
                        const gstPercentage = parseFloat(product.pricing?.gstDetails?.gstPercentage || 0);
                        const gstAmount = (basePrice * gstPercentage) / 100;
                        taxAmount += gstAmount;
                        console.log(`GST Applied (${gstPercentage}%): ${gstAmount}`);
                    }

                    // Add additional taxes if any
                    if (product.pricing?.additionalTaxes?.length > 0) {
                        product.pricing.additionalTaxes.forEach((tax) => {
                            if (tax?.percentage) {
                                const additionalTax = (basePrice * parseFloat(tax.percentage)) / 100;
                                taxAmount += additionalTax;
                                console.log(`Additional Tax (${tax.name} - ${tax.percentage}%): ${additionalTax}`);
                            }
                        });
                    }

                    // Final total price after adding taxes
                    const totalPrice = basePrice + taxAmount;
                    console.log(`Total Tax Amount: ${taxAmount}`);
                    console.log(`Final Total Price (including taxes): ${totalPrice}`);

                    // Generate tracking details
                    const trackingNumber = `TRACK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`; // Unique tracking per product
                    const expectedDeliveryDate = product.availability?.deliveryTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days

                    // Checkout record creation
                    const checkoutRecord = await checkoutModel.create({
                        user_id,
                        product_id: product._id,
                        product_img: product.images,
                        size: cartItem.size,
                        quantity: cartItem.quantity,
                        address,
                        phone_number,
                        paymentMode,
                        price: totalPrice,
                        razorpay_payment_id: paymentMode === "online" ? payment.order_id : null,
                        tracking_number: trackingNumber,
                        courier_service: "Delhivery",
                        expected_delivery_date: expectedDeliveryDate,
                        tracking_updates: [{ status: "Pending", timestamp: new Date() }]
                    });

                    checkoutRecords.push(checkoutRecord);

                    console.log(`Checkout Record Created: ${checkoutRecord._id}`);

                    // Remove item from cart
                    await cartModel.deleteOne({ user_id, product_id: cartItem.product_id });
                    console.log(`Removed item from cart: ${cartItem.product_id}`);
                }

            }

            return {
                message: "Checkout completed successfully",
                checkoutRecords,
                totalPrice,
            };
        } catch (error) {
            console.error("Error during checkout:", error);
            throw error;
        }
    },

    // ========================
    Invoice: async (data) => {
        try {
            console.log("datass", data.checkoutRecords);
            const validData = data.checkoutRecords;
            const invoices = [];

            const currentDate = new Date();
            const random = Math.floor(Math.random() * (1000 - 100 + 1)) + 1000;

            const year = currentDate.getFullYear();
            const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
            const date = currentDate.getDate().toString().padStart(2, "0");

            for (const record of validData) {
                // console.log("product_size", record.product_size);

                const invoiceNumber = `${year}${month}${date}-${random}`;

                const createInvoice = await invoiceModel.create({
                    checkout_id: record._id,
                    invoiceNumber,
                    size: record.size,
                    price: record.price,
                });
                console.log("createInvoice", createInvoice);
                invoices.push(createInvoice);
            }

            return invoices;
        } catch (error) {
            throw {
                error: "something wrong",
            };
        }
    },
    //   =========================
    wishlist: async (data) => {
        const { user_id, post_id } = data
        try {
            const exist = await FavoriteModel.findOne({ post_id });
            if (exist) {
                throw error("this product already exist")
            }
            const createWishlist = await FavoriteModel.create({ user_id, post_id })
            return createWishlist
        } catch (error) {
            throw error
        }
    },

    toggleBookmark: async (data) => {
        const { user_id, post_id, isBusinessAccount, isProduct } = data;
        try {
            const existingLike = await BookmarkModel.findOne({ user_id, post_id });

            if (existingLike) {
                await BookmarkModel.findOneAndDelete({ user_id, post_id });
                return { message: "Removed from Bookmark", marked: false };
            }

            const newMark = await BookmarkModel.create({ user_id, post_id, isBusinessAccount, isProduct });
            return { message: "Added to Bookmark", marked: true, data: newMark };
        } catch (error) {
            throw new Error(error.message || "Something went wrong while processing your request.");
        }
    },

    getUserBookmarks: async (user_id, page = 1, limit = 15) => {
        try {
            if (!user_id) return { success: false, message: "Invalid user ID" };

            const skip = (page - 1) * limit;

            const bookmarkedPosts = await BookmarkModel.find({ user_id })
                .select("post_id")
                .skip(skip)
                .limit(limit);

            const postIds = bookmarkedPosts.map(bookmark => bookmark.post_id);

            const totalBookmarks = await BookmarkModel.countDocuments({ user_id });

            const posts = await createPostModel.find({ _id: { $in: postIds } })
                .select("productId likesCount imageUrl thumbnailFile isVideo aspectRatio isBusinessPost isUserPost isProductPost viewsCount")
                .lean();

            return {
                success: true,
                data: posts,
                pagination: {
                    totalResults: totalBookmarks,
                    totalPages: Math.ceil(totalBookmarks / limit),
                    currentPage: Number(page),
                    limit,
                    hasNextPage: page < Math.ceil(totalBookmarks / limit),
                    hasPreviousPage: page > 1,
                },
            };
        } catch (error) {
            throw new Error(error.message || "Failed to fetch bookmarked posts.");
        }
    },

    toggleFav: async (data) => {
        const { user_id, post_id, isBusinessAccount, isProduct } = data;

        try {
            const existingLike = await FavoriteModel.findOne({ user_id, post_id });

            // Find or create the "LikedPosts" playlist
            let likedPostsPlaylist = await Playlist.findOne({ userId: user_id, name: "LikedPosts" });

            if (!likedPostsPlaylist) {
                likedPostsPlaylist = await Playlist.create({
                    playlistId: uuidv4(),
                    userId: new mongoose.Types.ObjectId(user_id),
                    name: "LikedPosts",
                    videos: [],
                    isPublic: false,
                });
            }

            if (existingLike) {
                await FavoriteModel.findOneAndDelete({ user_id, post_id });
                await createPostModel.findByIdAndUpdate(post_id, { $inc: { likesCount: -1 } });

                // Remove post from LikedPosts playlist
                await Playlist.updateOne(
                    { _id: likedPostsPlaylist._id },
                    { $pull: { videos: post_id } }
                );

                return { message: "Removed from favorites", liked: false };
            }

            const newLike = await FavoriteModel.create({ user_id, post_id, isBusinessAccount, isProduct });
            await createPostModel.findByIdAndUpdate(post_id, { $inc: { likesCount: 1 } });

            // Add post to LikedPosts playlist (only if not already in)
            if (!likedPostsPlaylist.videos.includes(post_id)) {
                await Playlist.updateOne(
                    { _id: likedPostsPlaylist._id },
                    { $addToSet: { videos: post_id } }
                );
            }

            return { message: "Added to favorites", liked: true, data: newLike };
        } catch (error) {
            throw new Error(error.message || "Something went wrong while processing your request.");
        }
    },



    getUserFavorites: async (user_id, page = 1, limit = 15) => {
        try {
            if (!user_id) return { success: false, message: "Invalid user ID" };

            const skip = (page - 1) * limit;
            const favoritePostDocs = await FavoriteModel.find({ user_id }).select("post_id");
            const postIds = favoritePostDocs.map(fav => fav.post_id);
            console.log(postIds, "postIds")
            const activePostCount = await createPostModel.countDocuments({
                _id: { $in: postIds },
                Product_status: { $ne: "Deactivate" }
            });
            console.log(activePostCount, "activePostCount")
            const totalFavorites = activePostCount;
            const totalPages = Math.ceil(totalFavorites / limit);
            const posts = await createPostModel.find({ _id: { $in: postIds }, Product_status: { $ne: "Deactivate" } })
                .sort({ likesCount: -1 })
                .skip(skip)
                .limit(limit)
                .lean();


            let objectId;
            if (mongoose.Types.ObjectId.isValid(user_id)) {
                objectId = new mongoose.Types.ObjectId(user_id);
            }

            const bookmarkedPosts = objectId
                ? await BookmarkModel.find({ user_id: objectId }).select("post_id")
                : [];

            const bookmarkSet = new Set(bookmarkedPosts.map(b => b.post_id.toString()));

            const formattedPosts = await Promise.all(
                posts.map(async (post) => {
                    const isFavorite = true; // Since this is getUserFavorites
                    const isBookmarked = bookmarkSet.has(post._id.toString());

                    let topComments = await CommentModel.find({ postId: post._id })
                        .sort({ likesCount: -1, createdAt: -1 })
                        .limit(2)
                        .lean();

                    if (!topComments.length) {
                        topComments = await CommentModel.find({ postId: post._id })
                            .sort({ createdAt: -1 })
                            .limit(2)
                            .lean();
                    }

                    const formattedComments = await Promise.all(
                        topComments.map(async (comment) => {
                            const user = await UserInfo.findOne({ id: comment.userId });
                            return {
                                commentId: comment._id.toString(),
                                id: comment._id.toString(),
                                content: comment.content,
                                createdAt: comment.createdAt,
                                userInfo: {
                                    name: user?.name || "",
                                    avatar: user?.avatarUrl || "",
                                },
                            };
                        })
                    );

                    return {
                        id: post._id.toString(),
                        username: post.userName,
                        userAvatar: post.userAvatar,
                        caption: post.caption,
                        thumbnailUrl: post.thumbnailUrl,
                        likesCount: post.likesCount,
                        commentsCount: post.commentsCount,
                        viewsCount: post.viewsCount,
                        sharesCount: post.sharesCount,
                        rePostCount: post.rePostCount,
                        userId: post.userId,
                        productId: post.productId,
                        isBusinessAccount: post.isBusinessAccount,
                        isRepost: post.isRepost,
                        isOwnPost: post.isOwnPost,
                        isProductPost: post.isProductPost,
                        mediaItems: (post.mediaItems || []).map(media => ({
                            url: media.url,
                            type: media.type,
                            thumbnailUrl: media.thumbnailUrl,
                            productName: media.productName,
                            price: media.price,
                            originalPrice: media.originalPrice,
                            hasDiscount: media.hasDiscount,
                        })),
                        repostDetails: post.repostDetails ? {
                            originalPostId: post.repostDetails.originalPostId?.toString() || "",
                            originalUserId: post.repostDetails.originalUserId || "",
                            originalUserName: post.repostDetails.originalUserName || "",
                            originalUserAvatar: post.repostDetails.originalUserAvatar || "",
                            originalCaption: post.repostDetails.originalCaption || "",
                            originalMediaItems: (post.repostDetails.originalMediaItems || []).map(media => ({
                                url: media.url,
                                type: media.type,
                                thumbnailUrl: media.thumbnailUrl,
                                productName: media.productName,
                                price: media.price,
                                originalPrice: media.originalPrice,
                                hasDiscount: media.hasDiscount,
                            })),
                        } : null,
                        likes: post.likesCount,
                        comments: formattedComments,
                        timestamp: post.timestamp,
                        isFavorite,
                        isBookmarked,
                    };
                })
            );

            return {
                success: true,
                posts: formattedPosts,
                pagination: {
                    totalResults: totalFavorites,
                    totalPages,
                    currentPage: Number(page),
                    limit,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1,
                },
            };
        } catch (error) {
            throw new Error(error.message || "Failed to fetch favorite posts.");
        }
    },


    // =======================
    deleteWishlist: async (data) => {
        const { post_id, user_id } = data
        console.log(post_id, "ppppp")
        try {
            const deleteWishlist = await FavoriteModel.findOneAndDelete({ user_id, post_id });
            if (!deleteWishlist) {
                throw error({ message: "Product removed from favorites" })
            }
            return deleteWishlist
        } catch (error) {
            throw error
        }
    },
    // ===========================
    getWishlist: async (user_id) => {
        console.log(user_id, "Received user_id");

        try {
            const userId = user_id?.id ? user_id.id.toString() : user_id;
            console.log(userId, "Processed userId");

            if (!userId) {
                throw new Error("Invalid user_id provided");
            }

            // Fetch wishlist items only for the given user_id
            const getWishList = await FavoriteModel.find({ user_id: userId }).lean();
            console.log(getWishList, "Fetched wishlist items");

            if (getWishList.length === 0) {
                return [];
            }

            // Extract post_ids from the wishlist
            const productIds = getWishList.map(item => item.post_id);

            // Fetch products that match the wishlist items
            const products = await Product.find({ _id: { $in: productIds } }).lean();
            console.log(products, "Fetched products");

            // Format the response
            const result = products.map(product => ({
                user_id: userId,
                product_id: product?._id || null,
                productName: product?.productName || "Unknown",
                images: product?.images || null,
                category: product?.basicInfo?.categories || null,
                colors: product?.variants?.[0]?.color || null,
                size: product?.variants?.[0]?.variant || null,
                quantity: product?.variants?.[0]?.quantity || 0,
                price: product?.pricing.salePrice || 0,
                gst: product?.pricing.gstDetails.gstPercentage || 0,
                originalPrice: product?.pricing.regularPrice || 0,
                discount: product?.discount || 0,
                unit: product?.unit || "N/A"
            }));

            console.log(result, "Formatted wishlist response");
            return result;

        } catch (error) {
            console.error("Error in getWishlist:", error);
            throw error;
        }
    },

    // =====================
    getOrderHistory: async (user_id) => {
        console.log(user_id)
        try {
            const orders = await checkoutModel.find({ user_id })
            console.log(orders)
            if (!orders.length) {
                throw new Error("No order history found");
            }

            return orders;
        } catch (error) {
            throw new Error("Error fetching order history");
        }
    },
    // ==========================
    updateOrderStatus: async (checkout_id, newStatus) => {
        console.log(checkout_id, newStatus)
        try {
            const order = await checkoutModel.findById(checkout_id);
            if (!order) throw new Error("Order not found");

            order.status = newStatus;
            order.tracking_updates.push({ status: newStatus, timestamp: new Date() });

            await order.save();
            return order;
        } catch (error) {
            throw new Error("Error updating order status");
        }
    },
    addInterest: async (data) => {
        const { user_id, interest } = data;
        try {
            const addInterest = await registerModel.findByIdAndUpdate(user_id,
                { interest: interest },
                { new: true });
            return addInterest
        } catch (error) {
            console.log(error)
            throw error
        }
    },





    getCollection: async (userId) => {
        console.log(userId, "userId");
        try {
            const collection = await Playlist.find({ userId });

            if (!collection || collection.length === 0) {
                throw new Error("No collections found for this user");
            }

            // Sort so "Favorites" is first
            collection.sort((a, b) => {
                if (a.name === "Favorites") return -1;
                if (b.name === "Favorites") return 1;
                return 0;
            });

            const groupedCollections = await Promise.all(
                collection.map(async (playlist) => {
                    const posts = await createPostModel.find({ _id: { $in: playlist.post_id } });
                    return {
                        _id: playlist._id,
                        name: playlist.name,
                        userId: playlist.userId,
                        posts: posts,
                    };
                })
            );

            return groupedCollections;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }





}



export default adminService;