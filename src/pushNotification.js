import axios from "axios"


const ONE_SIGNAL_APP_ID = '5e250119-1cc5-42e6-ab67-43d03443819b';
const ONE_SIGNAL_API_KEY = 'os_v2_app_lysqcgi4yvbonk3hipidiq4btnv7wmh7itceqvmq4br2dzmibrxlnv4wx6dxw2k3r65mq4vvsqwqjx2aquostov2i4brvf5dlr3pzea';



const pushNotification={
   
sendNotificationToDevice : async (message, deviceTokens) => {
    console.log(message, deviceTokens,"ppp")
      try {
          const response = await axios.post(
              "https://onesignal.com/api/v1/notifications",
              {
                  app_id: ONE_SIGNAL_APP_ID,
                  include_player_ids: deviceTokens,  
                  contents: { en: message },
              },
              {
                  headers: {
                      Authorization: `Basic ${ONE_SIGNAL_API_KEY}`,
                      "Content-Type": "application/json",
                  },
              }
          );
          console.log(deviceTokens,"dev");
  
          console.log("OneSignal Response:", response.data);
          return response.data;
      } catch (error) {
          console.error("Failed to send notification:", error.response?.data || error.message);
          throw new Error("Failed to send notification: " + (error.response?.data?.errors || error.message));
      }
  }
  


}



export default pushNotification