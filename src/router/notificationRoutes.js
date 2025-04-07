import express from 'express';
// import { registerDeviceToken } from '../service/pushNotificationService.js';
// import { handleSuccess, handleError } from '../utils/responseHandler.js';
import { getNotifications } from "../controller/notificationController.js";


const router = express.Router();


router.get("/getNotifications", getNotifications);

// Register device token
// router.post('/register-device', async (req, res) => {
//   try {
//     const { user_id, device_token, device_type } = req.body;
    
//     if (!user_id || !device_token || !device_type) {
//       return handleError(res, 400, 'Missing required fields');
//     }
    
//     await registerDeviceToken(user_id, device_token, device_type);
//     return handleSuccess(res, 200, 'Device token registered successfully');
//   } catch (error) {
//     return handleError(res, 500, `Error registering device token: ${error.message}`);
//   }
// });

export default router;