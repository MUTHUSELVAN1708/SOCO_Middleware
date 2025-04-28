import Media from "../model/likeModel.js"
import User from "../model/registerModel.js"
import mongoose from "mongoose"
export const likeItem = async (req, res) => {
    try {
        const { user_id, itemId, type } = req.body;
    
        console.log('user_id received:', user_id);
    
        if (!mongoose.Types.ObjectId.isValid(user_id)) {
          return res.status(400).json({ message: 'Invalid userId'});
        }
    
        const user = await User.findOne({_id:user_id});
    console.log(user

    )
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }

        // Check if already liked
        const alreadyLiked = user.likedItems.find(
            (item) => item.itemId.toString() === itemId && item.type === type
        );

        if (alreadyLiked) {
            return res.status(400).json({ message: 'Already liked this item' });
        }

        
        user.likedItems.push({ itemId, type });

        await user.save();

        res.status(200).json({ message: 'Item liked successfully', likedItems: user.likedItems });
    } catch (error) {
        console.log(error)
    }
};

 export const getUserLikes = async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId).populate('likes');
  
      if (!user) return res.status(404).json({ message: 'User not found' });
  
      return res.status(200).json({ likedMedia: user.likes });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  };
  