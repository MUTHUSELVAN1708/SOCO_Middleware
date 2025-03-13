import axios from "axios"

// import OneSignal from '@onesignal/node-onesignal'
// import { Client } from 'onesignal-node'; // For ES Modules

const ONE_SIGNAL_APP_ID = '46e90495-8cb8-4500-ae91-90edb10dd101';
const ONE_SIGNAL_API_KEY = 'os_v2_app_i3uqjfmmxbcqblursdw3cdorafyrqb7hkaoeyv5yajysegzauje6orn5rqc5cqselsezfreyrd2rbvo46hpuq4j7hwjmn6ffxl5nv7i';

// const configuration = OneSignal.createConfiguration({
//     authMethods: {
//       app_key: ONE_SIGNAL_API_KEY, // Replace with your REST API Key
//     },
//   });
//   const client = new OneSignal.DefaultApi(configuration);

// const client = new Client(ONE_SIGNAL_APP_ID, ONE_SIGNAL_API_KEY);


const pushNotification={
    // sendNotificationToDevice: async (deviceToken, title, message, datas) => {
    //     const url = 'https://onesignal.com/api/v1/notifications';
    //     const appId = ONE_SIGNAL_APP_ID;  // Ensure your OneSignal App ID is correct
    //     const restApiKey = ONE_SIGNAL_API_KEY;  // Ensure your OneSignal API Key is correct
        
    //     const notificationData = {
    //         app_id: appId,
    //         include_player_ids: Array.isArray(deviceToken) ? deviceToken : [deviceToken], // Ensure it's an array
    //         headings: { en: title },  // Title of the notification
    //         contents: { en: message },  // Body of the notification
    //         data: datas || {}  // Optional additional data to pass in the notification
    //     };
    
    //     try {
    //         const response = await axios.post(url, notificationData, {
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 Authorization: `Basic ${restApiKey}`,
    //             },
    //         });
    //         console.log('Notification sent successfully:', response.data);
    //         return response.data;
    //     } catch (error) {
    //         console.error('Error sending notification:', error.response?.data || error.message);
    //         throw error;  // Rethrow the error for further handling in the calling function
    //     }
    // }
   
    


// Initialize OneSignal client


// sendNotificationToDevice :async (message, playerIds) => {
//     console.log(message, playerIds,"ooo")
//   try {
//     const notification = {
//       app_id:ONE_SIGNAL_APP_ID, 
//       contents: { en: message }, // Notification message
//       include_player_ids: playerIds, // Target specific users
//     };

//     // Send the notification
//     const response = await client.createNotification(notification);
//     return response.body; // Return OneSignal's response
//   } catch (error) {
//     console.error("Error sending notification:", error.message);
//     throw new Error(error.message);
//   }
// },







//  sendNotificationToDevice :async (message, playerIds) => {
//   console.log("Message:", message, "Player IDs:", playerIds); // Debugging logs

//   try {
//     if (!ONE_SIGNAL_APP_ID || !ONE_SIGNAL_API_KEY) {
//       throw new Error("Missing OneSignal configuration: App ID or API Key is not set.");
//     }

//     if (!Array.isArray(playerIds) || playerIds.length === 0) {
//       throw new Error("Player IDs are required and should be an array of valid OneSignal player IDs.");
//     }

    
//     const notification = {
//       app_id: ONE_SIGNAL_APP_ID, // App ID from OneSignal
//       contents: { en: message }, // Notification message
//       include_player_ids: playerIds, // Target specific users
//     };

//     // Send the notification
//     const response = await client.createNotification(notification);
//     console.log("Notification sent successfully:", response.body); // Log the successful response
//     return response.body; // Return OneSignal's response
//   } catch (error) {
//     console.error("Error sending notification:", {
//       message: error.message,
//       stack: error.stack,
//       details: error.response?.data || error, // Include more details if available
//     });
//     throw new Error(`Failed to send notification: ${error.message}`);
//   }
// },




sendNotificationToDevice : async (message, deviceTokens) => {
    console.log(message, deviceTokens,"ppp")
      try {
          const response = await axios.post(
              "https://onesignal.com/api/v1/notifications",
              {
                  app_id: ONE_SIGNAL_APP_ID,
                  include_player_ids: deviceTokens,  // Use OneSignal Player IDs
                  contents: { en: message },
              },
              {
                  headers: {
                      Authorization: Basic `${ONE_SIGNAL_API_KEY}`,
                      "Content-Type": "application/json",
                  },
              }
          );
          console.log(deviceTokens,"dev")
  
          console.log("OneSignal Response:", response.data);
          return response.data;
      } catch (error) {
          console.error("Failed to send notification:", error.response?.data || error.message);
          throw new Error("Failed to send notification: " + (error.response?.data?.errors || error.message));
      }
  }
  


}



export default pushNotification