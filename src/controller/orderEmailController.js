import mongoose from "mongoose";
import nodemailer from "nodemailer";



const orderEmailController = {
    cancelOrderByuserEmail :async (receiverMail, product, order,cancelReason ) => {
        console.log(receiverMail, product, order,cancelReason)
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
                subject: "Order Cancellation Notification ❌",
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background-color: #cc0000; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">Order Cancelled ❌</h1>
                    </div>
                    
                    <div style="padding: 20px; background-color: #ffffff;">
                        <h2 style="color: #333333;">Order Cancellation Notice</h2>
                        
                        <p>Dear Seller,</p>
                        
                        <p>We want to inform you that the buyer has cancelled their order for <strong>${product}</strong>. Please check your order dashboard for further details.</p>
                        
                        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; text-align: center; border-radius: 5px;">
                            <h2 style="color: #cc0000; margin: 0;">Order Details</h2>
                            <p style="font-size: 16px; color: #333333; margin: 10px 0;"><strong>Product:</strong> ${product}</p>
                            <p style="font-size: 16px; color: #333333; margin: 10px 0;"><strong>Order ID:</strong> ${order}</p>
                          <p style="font-size: 16px; color: #333333; margin: 10px 0;"><strong>Cancellation Reason:</strong> ${cancelReason}</p>
                        </div>
                        
                        <p><strong>Next Steps:</strong></p>
                        <ul style="padding-left: 20px;">
                            <li>Review the cancellation in your order dashboard</li>
                            <li>If necessary, contact the buyer for further details</li>
                            <li>Update your inventory accordingly</li>
                            <li>Reach out to support if you need assistance</li>
                        </ul>
                        
                        <p style="color: #666666; font-size: 12px; margin-top: 20px;">If you have any concerns about this cancellation, please contact our support team for assistance.</p>
                    </div>
                    
                    <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
                        <p style="margin: 0; color: #666666;">
                            Connect with us on
                            <a href="#" style="color: #cc0000; text-decoration: none;">LinkedIn</a> |
                            <a href="#" style="color: #cc0000; text-decoration: none;">Twitter</a> |
                            <a href="#" style="color: #cc0000; text-decoration: none;">Instagram</a>
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
            console.error("Error in sending order cancellation email:", error);
            throw new Error("Failed to send cancellation email. Please try again later.");
        }
    },
};

export default orderEmailController;