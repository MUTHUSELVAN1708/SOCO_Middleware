import redis from 'redis';
import MessageModel from '../model/chatModel.js';

const redisClient = redis.createClient();
const subscriber = redis.createClient();

const redisService = {
  // Connect to Redis
  async connect() {
    try {
      await redisClient.connect();
      console.log('Redis client connected');
      await subscriber.connect();
      console.log('Redis subscriber connected');
    } catch (err) {
      console.error('Redis connection failed:', err);
      process.exit(1);
    }
  },

  // Subscribe to notification channels
  subscribeToNotifications:async (io) =>{
    try {
      await subscriber.pSubscribe('notifications:*', (message, channel) => {
        const userId = channel.split(':')[1]; 
        if (userId) {
          io.to(userId).emit('new_message', JSON.parse(message)); 
        }
      });
      console.log('Subscribed to notification channels');
    } catch (err) {
      console.error('Error subscribing to Redis channels:', err);
    }
  },

  getRedisClient() {
    return redisClient;
  },

  getSubscriber() {
    return subscriber;
  },

  deleteFromRedis:async (chatKey, messagesToDelete)=> {
    console.log(chatKey, messagesToDelete,"lopp")
    try {
      const messagesArray = Array.isArray(messagesToDelete) ? messagesToDelete : [messagesToDelete];
      let removedCount = 0;

      for (const message of messagesArray) {
        const count = await redisClient.lRem(chatKey, 1, JSON.stringify(message));
        removedCount += count;
      }

      if (removedCount > 0) {
        console.log(`${removedCount} message(s) deleted successfully`);
      } else {
        console.log('No messages found to delete');
      }
      return " message(s) deleted successfully"
    } catch (err) {
      console.error('Error deleting message(s):', err);
    }
  },

  // ==================
  updateMessage: async (chatKey, oldMessage, newMessage) => {
    try {

      const oldMessageString = JSON.stringify(oldMessage);
      const newMessageString = JSON.stringify(newMessage);
  
      
      const messages = await redisClient.lRange(chatKey, 0, -1);
  
      
      console.log('Messages fetched from Redis:', messages);
  
      
      console.log('Old message string:', oldMessageString);
  
  
      await redisClient.lRem(chatKey, 1, oldMessageString);
  
      await redisClient.rPush(chatKey, newMessageString);
  
      console.log('Message updated in Redis');
  
      const updatedMessage = await MessageModel.findOneAndUpdate(
        { _id: oldMessage._id }, 
        newMessage, 
        { new: true } 
      );
  
      if (!updatedMessage) {
        console.log('Message not found in database');
        return { error: 'Message not found in database' };
      }
  
      console.log('Message updated in database');
      return { success: true, message: 'Message updated successfully in Redis and database' };
  
    } catch (err) {
      console.error('Error updating message:', err);
      throw err;
    }
  }
  
  

};



export default redisService;
