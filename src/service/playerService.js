



    import axios  from "axios";

    // Constants
    const ONE_SIGNAL_API_KEY = "os_v2_app_i3uqjfmmxbcqblursdw3cdorafyrqb7hkaoeyv5yajysegzauje6orn5rqc5cqselsezfreyrd2rbvo46hpuq4j7hwjmn6ffxl5nv7i";
    const ONE_SIGNAL_APP_ID = "46e90495-8cb8-4500-ae91-90edb10dd101";   
    
    const playerService = {
   
      
      getAllPlayers: async () => {
        try {
          const response = await axios.get("https://onesignal.com/api/v1/players", {
            headers: {
              Authorization: `Basic ${ONE_SIGNAL_API_KEY}`,
              "Content-Type": "application/json",
            },
            params: {
              app_id: ONE_SIGNAL_APP_ID,
            },
          });
          return response.data; 
        } catch (error) {
          console.error("Error fetching players:", error.message);
          throw new Error("Failed to fetch players from OneSignal");
        }
      },
    
      
      getPlayerById: async (playerId) => {
        try {
          const response = await axios.get(`https://onesignal.com/api/v1/players/${playerId}`, {
            headers: {
              Authorization: `Basic ${ONE_SIGNAL_API_KEY}`,
              "Content-Type": "application/json",
            },
          });
          return response.data; 
        } catch (error) {
          console.error(`Error fetching player with ID ${playerId}:`, error.message);
          throw new Error("Failed to fetch player details from OneSignal");
        }
      },
    }
    


    

export default playerService