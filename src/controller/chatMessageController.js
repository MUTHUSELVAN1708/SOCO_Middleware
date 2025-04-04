import ChatMessageModel from "../model/ChatMessageModel.js";
import ChatMember from "../model/chatMembers.js";
import User from "../model/registerModel.js";
import BusinessModel from "../model/BusinessModel.js";
import { handleSuccessV1, handleError } from "../utils/responseHandler.js";
import natural from "natural";

export const fetchChatMembers = async (req, res) => {
  try {
    const { userId, query = "" } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const trimmedQuery = query.trim();
    console.log(`Fetching chat members for user: ${userId}, search query: "${trimmedQuery}"`);

    let allMembers = new Map();
    const searchLower = trimmedQuery.toLowerCase();
    const searchRegex = new RegExp(trimmedQuery, "i");

    // Fetch user data to get their pin code
    const currentUser = await User.findById(userId);
    let userPinCode = currentUser?.pinCode || null;

    if (!currentUser) {
      const currentBusiness = await BusinessModel.findById(userId);
      if (currentBusiness) {
        userPinCode = currentBusiness.businessPinCode;
      } else {
        return res.status(404).json({ success: false, message: "User or Business not found" });
      }
    } else {
      userPinCode = currentUser.pinCode;
    }

    // 1️⃣ Fetch from ChatMember
    const chatMember = await ChatMember.findOne({ userId });
    if (chatMember?.player?.length) {
      chatMember.player.forEach(member => {
        if (member.playerId !== userId && !allMembers.has(member.playerId)) {
          allMembers.set(member.playerId, {
            id: member.playerId,
            name: member.name,
            avatarUrl: member.avatarUrl || "",
            status: member.status,
            isOnline: member.isOnline,
          });
        }
      });
    }

    // If no query and no members found, fetch nearby users and businesses
    if (!trimmedQuery && allMembers.size === 0 && userPinCode) {
      console.log(`No chat members found, fetching nearby users and businesses for pin code: ${userPinCode}`);

      // Fetch nearby users (excluding self)
      const nearbyUsers = await User.find({ pinCode: userPinCode, _id: { $ne: userId } }).limit(15);
      nearbyUsers.forEach(user => {
        if (!allMembers.has(user._id.toString())) {
          allMembers.set(user._id.toString(), {
            id: user._id.toString(),
            name: user.full_Name,
            avatarUrl: user.profile_url || "",
            status: "Nearby User",
            isOnline: user.onlineStatus || false,
          });
        }
      });

      // Fetch nearby businesses
      const nearbyBusinesses = await BusinessModel.find({ businessPinCode: userPinCode }).limit(15);
      nearbyBusinesses.forEach(business => {
        if (!allMembers.has(business._id.toString())) {
          allMembers.set(business._id.toString(), {
            id: business._id.toString(),
            name: business.businessName,
            avatarUrl: business.brand_logo || "",
            status: "Nearby Business",
            isOnline: business.onlineStatus || false,
          });
        }
      });

      console.log(`Found ${allMembers.size} nearby users and businesses`);
    }

    // If no query, return available chat members or nearby users/businesses
    if (!trimmedQuery) {
      const responseMembers = Array.from(allMembers.values());
      console.log(`Returning ${responseMembers.length} members (chat or nearby users/businesses)`);
      return res.status(200).json({ success: true, data: responseMembers });
    }

    // **Similarity Calculation Helper**
    const calculateSimilarity = (name) => {
      const nameLower = name.toLowerCase();
      const levenshteinDistance = natural.LevenshteinDistance(searchLower, nameLower);
      const maxLength = Math.max(searchLower.length, nameLower.length);
      return ((maxLength - levenshteinDistance) / maxLength) * 100;
    };

    // 2️⃣ Fetch from User
    const userSearch = await User.find({ full_Name: searchRegex }).limit(15);
        userSearch.forEach(user => {
      if (!allMembers.has(user._id.toString())) {
        const similarity = calculateSimilarity(user.full_Name);
        allMembers.set(user._id.toString(), {
          id: user._id.toString(),
          name: user.full_Name,
          avatarUrl: user.profile_url || "",
          status: "User",
          isOnline: user.onlineStatus || false,
          similarity,
        });
      }
    });

    // 3️⃣ Fetch from BusinessModel
    const businessSearch = await BusinessModel.find({ businessName: searchRegex }).limit(15);    businessSearch.forEach(business => {
      if (!allMembers.has(business._id.toString())) {
        const similarity = calculateSimilarity(business.businessName);
        allMembers.set(business._id.toString(), {
          id: business._id.toString(),
          name: business.businessName,
          avatarUrl: business.brand_logo || "",
          status: "Business",
          isOnline: business.onlineStatus || false,
          similarity,
        });
      }
    });

    // **Filter out chat members with zero similarity**
    const filteredMembers = Array.from(allMembers.values()).filter(member => member.similarity > 0);

    // **Sort by highest similarity percentage**
    const responseMembers = filteredMembers
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 15)
      .map(({ similarity, ...rest }) => rest);

    console.log(`Returning ${responseMembers.length} ranked chat members`);
    res.status(200).json({ success: true, data: responseMembers });

  } catch (error) {
    console.error("Error fetching chat members:", error);
    res.status(500).json({ success: false, message: "Failed to fetch chat members", error: error.message });
  }
};









// Add a new message
export const addMessage = async (req, res) => {
  try {
    const { senderId, receiverId, ...messageData } = req.body;

    console.log("Received Request Data:", req.body);

    // Check if senderId (playerId) exists in receiver's ChatMember user list
    console.log(`Checking if sender (${senderId}) exists in receiver (${receiverId})'s chat members...`);
    const receiverChatMember = await ChatMember.findOne({ userId: receiverId });

    if (!receiverChatMember) {
      console.log(`Receiver (${receiverId}) does not have a chat member entry. Creating new entry.`);
    }

    const isSenderPresent = receiverChatMember?.player.some(p => p.playerId === senderId);

    console.log(`Sender (${senderId}) found in receiver (${receiverId})'s player list:`, isSenderPresent);

    if (!isSenderPresent) {
      console.log(`Sender (${senderId}) not found in receiver (${receiverId})'s chat members. Adding now...`);
      await addChatMember({ userId: receiverId, playerId: senderId });
    }

    // Save the new message
    console.log(`Saving message from sender (${senderId}) to receiver (${receiverId})...`);
    const newMessage = new ChatMessageModel({ senderId, receiverId, ...messageData });
    await newMessage.save();

    console.log(`Message saved successfully with ID: ${newMessage._id}`);

    // Convert timestamp to local time before sending response
    const responseMessage = newMessage.toObject();
    responseMessage.timestamp = new Date(responseMessage.timestamp).toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

    console.log("Final response message:", responseMessage);

    res.status(201).json({ success: true, message: "Message added successfully", data: responseMessage });
  } catch (error) {
    console.error("Error in addMessage:", error);
    res.status(500).json({ success: false, message: "Failed to add message", error: error.message });
  }
};



export const addChatMember = async ({ userId, playerId }) => {
  try {
    console.log("Received request to add chat member with:", { userId, playerId });

    if (!userId || !playerId) {
      throw new Error("Missing userId or playerId");
    }

      if (!userId || !playerId) {
          console.error("Missing required fields:", { userId, playerId });
          return handleError(res, 400, "Missing required fields");
      }

      const getUserDetails = async (id) => {
          console.log(`Fetching details for ID: ${id}`);
          let user = await User.findById(id).select("full_Name profile_url lastOnline");
          if (user) return { details: user, reference: "User" };
          
          let business = await BusinessModel.findById(id).select("businessName brand_logo lastOnline");
          if (business) return { details: business, reference: "businessRegister" };
          
          return { details: null, reference: null };
      };

      const { details: userDetails, reference: userReference } = await getUserDetails(userId);
      const { details: playerDetails, reference: playerReference } = await getUserDetails(playerId);

      if (!userDetails || !playerDetails) {
          console.error("User or Player not found:", { userDetails, playerDetails });
          return handleError(res, 404, "User or Player not found");
      }

      console.log("User details fetched:", userDetails);
      console.log("Player details fetched:", playerDetails);

      const addOrUpdateChatMember = async (ownerId, ownerReference, memberId, memberReference, details, isFirst) => {
          console.log(`Starting addOrUpdateChatMember function`);
          console.log(`Received Params - Owner ID: ${ownerId}, Member ID: ${memberId}`);
          
          try {
              let chatMember = await ChatMember.findOne({ userId: ownerId });

              if (!chatMember) {
                  console.log(`Chat member not found for Owner ID: ${ownerId}. Creating new entry...`);
                  
                  const name = isFirst 
                      ? userDetails?.full_Name ?? userDetails?.businessName ?? "Unknown"
                      : playerDetails?.full_Name ?? playerDetails?.businessName ?? "Unknown";
                  
                  const avatarUrl = isFirst 
                      ? userDetails?.profile_url ?? userDetails?.brand_logo ?? ""
                      : playerDetails?.profile_url ?? playerDetails?.brand_logo ?? "";

                  const lastSeen = isFirst 
                      ? userDetails?.lastOnline ?? ""
                      : playerDetails?.lastOnline ?? "";

                  chatMember = new ChatMember({
                      userId: ownerId,
                      name,
                      avatarUrl,
                      lastSeen,
                      userReference: ownerReference,
                      player: [],
                  });
              }

              const existingPlayerIndex = chatMember.player.findIndex(p => p.playerId === memberId);
              
              if (existingPlayerIndex !== -1) {
                  chatMember.player[existingPlayerIndex] = {
                      ...chatMember.player[existingPlayerIndex],
                      playerId: memberId,
                      name: details?.full_Name || details?.businessName || "Unknown",
                      avatarUrl: details?.profile_url || details?.brand_logo || "",
                      playerReference: memberReference,
                      lastSeen: details?.lastSeen || new Date(),
                  };
              } else {
                  chatMember.player.push({
                      playerId: memberId,
                      name: details?.full_Name || details?.businessName || "Unknown",
                      avatarUrl: details?.profile_url || details?.brand_logo || "",
                      playerReference: memberReference,
                      lastSeen: new Date(),
                      isOnline: false,
                      status: "Active",
                  });
              }

              await chatMember.save();
              console.log(`Chat member saved successfully for Owner ID: ${ownerId}`);
          } catch (error) {
              console.error(`Error in addOrUpdateChatMember function: ${error.message}`);
          }
      };

      await addOrUpdateChatMember(userId, userReference, playerId, playerReference, playerDetails, true);
      await addOrUpdateChatMember(playerId, playerReference, userId, userReference, userDetails, false);

      console.log("Chat members updated successfully");
      return handleSuccessV1(res, 200, "Chat members updated successfully");
  } catch (error) {
      console.error("Error in addChatMember:", error.message);
      return handleError(res, 500, error.message);
  }
};


// Delete a message by ID
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMessage = await ChatMessageModel.findOneAndDelete({ id });

    if (!deletedMessage) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    res.json({ success: true, message: "Message deleted successfully", data: deletedMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete message", error: error.message });
  }
};
