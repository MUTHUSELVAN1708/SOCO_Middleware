



    import axios  from "axios";

    // Constants
    const ONE_SIGNAL_API_KEY = "";
    const ONE_SIGNAL_APP_ID = "";   

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
          return response.data; // Return the player data
        } catch (error) {
          console.error("Error fetching players:", error.message);
          throw new Error("Failed to fetch players from OneSignal");
        }
      },
    
      /**
       * Fetch details of a specific player by Player ID
       */
      getPlayerById: async (playerId) => {
        try {
          const response = await axios.get(`https://onesignal.com/api/v1/players/${playerId}`, {
            headers: {
              Authorization: `Basic ${ONE_SIGNAL_API_KEY}`,
              "Content-Type": "application/json",
            },
          });
          return response.data; // Return the player details
        } catch (error) {
          console.error(`Error fetching player with ID ${playerId}:`, error.message);
          throw new Error("Failed to fetch player details from OneSignal");
        }
      },
    }
    


    

export default playerService