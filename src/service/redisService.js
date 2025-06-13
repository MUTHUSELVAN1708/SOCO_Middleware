// import redis from 'redis';
// import MessageModel from '../model/chatModel.js';

// const redisClient = redis.createClient();
// const subscriber = redis.createClient();

// const redisService = {
//   // Connect to Redis
//   async connect() {
//     try {
//       await redisClient.connect();
//       console.log('Redis client connected');
//       await subscriber.connect();
//       console.log('Redis subscriber connected');
//     } catch (err) {
//       console.error('Redis connection failed:', err);
//       process.exit(1);
//     }
//   },

//   // Subscribe to notification channels
//   subscribeToNotifications:async (io) =>{
//     try {
//       await subscriber.pSubscribe('notifications:*', (message, channel) => {
//         const userId = channel.split(':')[1]; 
//         if (userId) {
//           io.to(userId).emit('new_message', JSON.parse(message)); 
//         }
//       });
//       console.log('Subscribed to notification channels');
//     } catch (err) {
//       console.error('Error subscribing to Redis channels:', err);
//     }
//   },

//   getRedisClient() {
//     return redisClient;
//   },

//   getSubscriber() {
//     return subscriber;
//   },

//   deleteFromRedis:async (chatKey, messagesToDelete)=> {
//     console.log(chatKey, messagesToDelete,"lopp")
//     try {
//       const messagesArray = Array.isArray(messagesToDelete) ? messagesToDelete : [messagesToDelete];
//       let removedCount = 0;

//       for (const message of messagesArray) {
//         const count = await redisClient.lRem(chatKey, 1, JSON.stringify(message));
//         removedCount += count;
//       }

//       if (removedCount > 0) {
//         console.log(`${removedCount} message(s) deleted successfully`);
//       } else {
//         console.log('No messages found to delete');
//       }
//       return " message(s) deleted successfully"
//     } catch (err) {
//       console.error('Error deleting message(s):', err);
//     }
//   },

//   // ==================
//   updateMessage: async (chatKey, oldMessage, newMessage) => {
//     try {

//       const oldMessageString = JSON.stringify(oldMessage);
//       const newMessageString = JSON.stringify(newMessage);
  
      
//       const messages = await redisClient.lRange(chatKey, 0, -1);
  
      
//       console.log('Messages fetched from Redis:', messages);
  
      
//       console.log('Old message string:', oldMessageString);
  
  
//       await redisClient.lRem(chatKey, 1, oldMessageString);
  
//       await redisClient.rPush(chatKey, newMessageString);
  
//       console.log('Message updated in Redis');
  
//       const updatedMessage = await MessageModel.findOneAndUpdate(
//         { _id: oldMessage._id }, 
//         newMessage, 
//         { new: true } 
//       );
  
//       if (!updatedMessage) {
//         console.log('Message not found in database');
//         return { error: 'Message not found in database' };
//       }
  
//       console.log('Message updated in database');
//       return { success: true, message: 'Message updated successfully in Redis and database' };
  
//     } catch (err) {
//       console.error('Error updating message:', err);
//       throw err;
//     }
//   }
  
  

// };



// export default redisService;


import redis from "redis";
import MessageModel from "../model/chatModel.js";

const redisClient = redis.createClient();
const subscriber = redis.createClient();

let isReconnecting = false; // Flag to prevent duplicate reconnections

const redisService = {
  async connect() {
    try {
      if (!redisClient.isOpen) await redisClient.connect();
      if (!subscriber.isOpen) await subscriber.connect();

      console.log(" Redis client & subscriber connected");

      redisClient.on("error", (err) => console.error("❌ Redis Client Error:", err));
      subscriber.on("error", (err) => console.error("❌ Redis Subscriber Error:", err));

      redisClient.on("end", () => redisService.handleReconnect());
      subscriber.on("end", () => redisService.handleReconnect());

      redisService.getRedisClient().on("reconnect", async () => {
        console.log("Redis reconnected! Restoring online users...");
    
        const storedUsers = await redisService.getRedisClient().hGetAll("connectedUsers");
        console.log(" Restoring users from Redis:", storedUsers);
    
        for (const userId in storedUsers) {
            if (!connectedUsers[userId]) {
                connectedUsers[userId] = storedUsers[userId];
            }
        }
    
        console.log(" Restored connected users:", JSON.stringify(connectedUsers, null, 2));
    });
    
    

      subscriber.on("connect", () => {
        console.log("Re-subscribing to Redis channels...");
        // Add re-subscribe logic here
      });

    } catch (err) {
      console.error(" Redis connection failed:", err);
    }
  },

  async handleReconnect() {
    if (!isReconnecting) {
      isReconnecting = true;
      console.warn("⚠️ Redis disconnected! Reconnecting...");

      setTimeout(async () => {
        if (!redisClient.isOpen || !subscriber.isOpen) {
          await redisService.connect();
        }
        isReconnecting = false;
      }, 2000);
    }
  },



  async subscribeToNotifications(io) {
    try {
      await subscriber.pSubscribe("notifications:*", (message, channel) => {
        const userId = channel.split(":")[1];
        if (userId) io.to(userId).emit("new_message", JSON.parse(message));
      });
      console.log("📡 Subscribed to Redis notifications");
    } catch (err) {
      console.error("❌ Error subscribing to Redis:", err);
    }
  },

  getRedisClient() {
    if (!redisClient.isOpen) {
      console.warn("⚠️ Redis client disconnected, reconnecting...");
      this.connect();
    }
    return redisClient;
  },

  getSubscriber() {
    if (!subscriber.isOpen) {
      console.warn(" Redis subscriber disconnected, reconnecting...");
      this.connect();
    }
    return subscriber;
  },

async deleteFromRedis(chatKey, messageToDelete) {
    try {
        const list = await redisClient.lRange(chatKey, 0, -1);

        let removed = 0;

        for (const item of list) {
            const parsed = JSON.parse(item);
            if (parsed._id === messageToDelete._id) {
                removed += await redisClient.lRem(chatKey, 1, item); // match exact item
                break;
            }
        }

        return removed > 0 ? "Deleted from Redis" : "Not found in Redis";
    } catch (err) {
        console.error("Error deleting from Redis:", err);
        throw err;
    }
},


  async updateMessage(chatKey, oldMessage, newMessage) {
    try {
      if (!redisClient.isOpen) await redisClient.connect();

      let messages = await redisClient.lRange(chatKey, 0, -1);
      let updated = false;

      messages = messages.map((msg) => {
        if (msg === JSON.stringify(oldMessage)) {
          updated = true;
          return JSON.stringify(newMessage);
        }
        return msg;
      });

      if (updated) {
        await redisClient.del(chatKey);
        await redisClient.rPush(chatKey, ...messages);
        console.log(" Message updated in Redis");
      } else {
        console.log(" Message not found in Redis");
      }

      const updatedMessage = await MessageModel.findOneAndUpdate(
        { _id: oldMessage._id },
        newMessage,
        { new: true }
      );

      if (!updatedMessage) {
        console.log("Message not found in database");
        return { error: "Message not found in database" };
      }

      console.log("Message updated in MongoDB");
      return { success: true, message: "Message updated successfully" };
    } catch (err) {
      console.error("Error updating message:", err);
      throw err;
    }
  },
};

export default redisService;
