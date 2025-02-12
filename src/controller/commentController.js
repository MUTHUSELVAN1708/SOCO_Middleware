import Comment from '../model/Comment.js';
import registerModel from '../model/registerModel.js';
import businessregisterModel from '../model/BusinessModel.js';
import createPostModel from '../model/createPostModel.js';
import CommentLike from '../model/CommentLike.js'; 
import UserInfo from '../model/UserInfo.js';
import { handleSuccess, handleError } from '../utils/responseHandler.js';
import { v4 as uuidv4 } from 'uuid';

const getCommentsByPost = async (req, res) => {
  const { postId } = req.params;
  const { page = 1, limit = 10, userId } = req.body;

  console.log(req.body);

  try {
    const parsedLimit = Number(limit);
    const parsedPage = Number(page);
    const skip = (parsedPage - 1) * parsedLimit;

    const totalResults = await Comment.countDocuments({ postId, parentCommentId: null });
    const totalPages = Math.ceil(totalResults / parsedLimit);

    let comments = await Comment.aggregate([
      { $match: { postId, parentCommentId: null } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parsedLimit },
      {
        $lookup: {
          from: 'userinfos',
          localField: 'userInfo',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          postId: 1,
          commentId: 1,
          userId: 1,
          content: 1,
          createdAt: 1,
          likesCount: 1,
          likes: 1,
          replyCount: 1,
          userInfo: {
            _id: 1,
            name: 1,
            avatarUrl: 1,
          },
        },
      },
    ]);

    // Sort user's comments first if userId is provided
    if (userId) {
      const userComments = comments.filter(comment => comment.userId === userId);
      const otherComments = comments.filter(comment => comment.userId !== userId);
      comments = [...userComments, ...otherComments];
    }

    // Fetch replies (limit to 2 and set hasMoreReplies accordingly)
    for (let comment of comments) {
      let replies = await Comment.aggregate([
        { $match: { postId, parentCommentId: comment.commentId } },
        { $sort: { createdAt: -1 } },
        { $limit: 3 },
        {
          $lookup: {
            from: 'userinfos',
            localField: 'userInfo',
            foreignField: '_id',
            as: 'userInfo',
          },
        },
        { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            postId: 1,
            commentId: 1,
            userId: 1,
            content: 1,
            createdAt: 1,
            likes: 1,
            likesCount: 1,
            parentCommentId: 1,
            userInfo: {
              _id: 1,
              name: 1,
              avatarUrl: 1,
            },
          },
        },
      ]);

      comment.hasMoreReplies = replies.length > 2;
      comment.replies = replies.slice(0, 2);
    }

    return res.status(200).json({
      statusCode: 200,
      message: 'Comments fetched successfully',
      data: {
        comments,
        totalComments: totalResults,
        hasMore: parsedPage < totalPages,
        nextPageToken: parsedPage < totalPages ? String(parsedPage + 1) : null,
        pagination: {
          totalResults,
          totalPages,
          currentPage: parsedPage,
          limit: parsedLimit,
          hasNextPage: parsedPage < totalPages,
          hasPreviousPage: parsedPage > 1,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: error.message,
      data: null,
    });
  }
};




const getReplies = async (req, res) => {
  const { commentId } = req.params;
  const { page = 1, limit = 10, userId } = req.body; // Default limit set to 10

  try {
    // Fetch the parent comment
    const parentCommentData = await Comment.findOne({ commentId }).populate('userInfo');

    if (!parentCommentData) {
      return handleError(res, 404, 'Parent comment not found');
    }

    // Convert the parent comment into the required `Comment` type
    const parentComment = {
      id: parentCommentData._id.toString(),
      commentId: parentCommentData.commentId.toString(),
      userId: parentCommentData.userId.toString(),
      content: parentCommentData.content,
      createdAt: parentCommentData.createdAt,
      likes: parentCommentData.likes.map(like => like.toString()),
      likeCount: parentCommentData.likesCount,
      replies: [], // Will be populated below
      parentId: parentCommentData.parentCommentId?.toString() || null,
      replyCount: parentCommentData.replyCount || 0,
      hasMoreReplies: false, // Will be set based on pagination
      userInfo: parentCommentData.userInfo,
    };

    // Count total replies
    const totalComments = await Comment.countDocuments({ parentCommentId: commentId });

    const totalPages = Math.ceil(totalComments / limit);
    const skip = (page - 1) * limit;

    // Fetch replies
    let repliesData = await Comment.find({ parentCommentId: commentId })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .populate('userInfo');

    // Convert replies to `Comment` type
    let replies = repliesData.map(reply => ({
      id: reply._id.toString(),
      userId: reply.userId.toString(),
      commentId: reply.commentId.toString(),
      content: reply.content,
      createdAt: reply.createdAt,
      likes: reply.likes.map(like => like.toString()),
      likeCount: reply.likesCount,
      replies: [],
      parentId: reply.parentCommentId?.toString() || null,
      replyCount: reply.replyCount || 0,
      hasMoreReplies: false,
      userInfo: reply.userInfo,
    }));

    // Prioritize replies from userId
    if (userId) {
      const userReplies = replies.filter(reply => reply.userId.toString() === userId);
      const otherReplies = replies.filter(reply => reply.userId.toString() !== userId);
      replies = [...userReplies, ...otherReplies];
    }

    // Assign replies inside the parent comment
    parentComment.replies = replies;
    parentComment.hasMoreReplies = page < totalPages;

    return handleSuccess(res, {
      message: 'Replies fetched successfully',
      data: {
        comments: [parentComment], // Parent comment now follows `Comment` type
        totalComments,
        hasMore: page < totalPages,
        pagination: {
          totalResults: totalComments,
          totalPages,
          currentPage: Number(page),
          limit: Number(limit),
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
    });
  } catch (error) {
    return handleError(res, 500, error.message);
  }
};




const addComment = async (req, res) => {
  console.log('before add comment call');
  const { postId, userId, content, isBusiness } = req.body;

  try {
      let user;

      if (isBusiness) {
          user = await businessregisterModel.findOne({ _id: userId });
      } else {
          user = await registerModel.findOne({ _id: userId });
      }
      console.log(isBusiness);
      console.log(userId);
      console.log(user);

      if (!user) {
          return res.status(404).json({
              success: false,
              statusCode: 404,
              message: 'User not found',
          });
      }

      let userInfo = await UserInfo.findOne({ id: user.id });

      if (userInfo) {
          // Update existing userInfo instead of deleting and recreating
          userInfo.name = isBusiness ? user.businessName : user.full_Name;
          userInfo.avatarUrl = isBusiness ? user.brand_logo : user.profile_url;
          await userInfo.save();
      } else {
          // Create new userInfo if it does not exist
          userInfo = await UserInfo.create({
              id: user.id,
              name: isBusiness ? user.businessName : user.full_Name,
              avatarUrl: isBusiness ? user.brand_logo : user.profile_url,
          });
      }

      console.log(userInfo);
      console.log(postId);

      const newComment = new Comment({
          postId,
          commentId: uuidv4(),
          userId,
          content,
          userInfo: userInfo._id, // Store ObjectId instead of full object
          likesCount: 0, // Set initial likesCount to 0
      });

      console.log(newComment);

      await newComment.save();

      console.log('----- after save comment -----');
      await createPostModel.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

      const populatedComment = await Comment.findById(newComment._id).populate('userInfo').exec();


      return res.status(201).json({
          success: true,
          statusCode: 201,
          message: 'Comment added successfully',
          data: populatedComment,
      });
  } catch (error) {
      return res.status(500).json({
          success: false,
          statusCode: 500,
          message: error.message,
      });
  }
};


const addReply = async (req, res) => {
  console.log(' ------- inside  addd replied 0 -------------');
  const { commentId } = req.params;
  const { postId, userId, content, isBusiness } = req.body;

  try {
    console.log(' ------- inside  addd replied -------------');
      const parentComment = await Comment.findOne({ commentId });
      if (!parentComment) return res.status(404).json({ success: false, message: 'Comment not found' });
      console.log(parentComment);

      let user;
      if (isBusiness) {
          user = await businessregisterModel.findOne({ _id: userId });
      } else {
          user = await registerModel.findOne({ _id: userId });
      }

      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      let userInfo = await UserInfo.findOne({ id: user.id });

      if (userInfo) {
          userInfo.name = isBusiness ? user.businessName : user.full_Name;
          userInfo.avatarUrl = isBusiness ? user.brand_logo : user.profile_url;
          await userInfo.save();
      } else {
          userInfo = await UserInfo.create({
              id: user.id,
              name: isBusiness ? user.businessName : user.full_Name,
              avatarUrl: isBusiness ? user.brand_logo : user.profile_url,
          });
      }

      const newReply = new Comment({
          postId,
          commentId: uuidv4(),
          userId,
          content,
          userInfo: userInfo._id,
          parentCommentId: commentId,
      });

      await newReply.save();

      parentComment.replyCount += 1;
      parentComment.hasMoreReplies = parentComment.replyCount > 5;
      await parentComment.save();

      const populatedReply = await Comment.findById(newReply._id).populate('userInfo').exec();

      return res.status(201).json({
          success: true,
          message: 'Reply added successfully',
          data: populatedReply,
      });
  } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
  }
};
  

  const likeComment = async (req, res) => {
    const { commentId } = req.params;
    const { userId } = req.body;
  
    try {
      const comment = await Comment.findOne({ commentId });
      if (!comment) return handleError(res, 404, 'Comment not found');
  
      // Check if the user has already liked the comment
      if (!comment.likes.includes(userId)) {
        // Add userId to the likes array
        const updateResult = await Comment.updateOne(
          { commentId },
          { 
            $push: { likes: userId }, 
            $inc: { likesCount: 1 } 
          }
        );
  
        if (updateResult.modifiedCount === 0) {
          return handleError(res, 500, 'Failed to update likes');
        }
      }
  
      return res.status(200).json({ message: 'Comment liked successfully' });
    } catch (error) {
      return handleError(res, 500, error.message);
    }
  };
  

  const unlikeComment = async (req, res) => {
    const { commentId } = req.params;
    const { userId } = req.body;
  
    try {
      const comment = await Comment.findOne({ commentId });
      if (!comment) return handleError(res, 404, 'Comment not found');
  
      // Check if the user has liked the comment
      if (comment.likes.includes(userId)) {
        // Remove userId from the likes array
        const updateResult = await Comment.updateOne(
          { commentId },
          { 
            $pull: { likes: userId }, 
            $inc: { likesCount: -1 } 
          }
        );
  
        if (updateResult.modifiedCount === 0) {
          return handleError(res, 500, 'Failed to update likes');
        }
      }
  
      return res.status(200).json({ message: 'Comment unliked successfully' });
    } catch (error) {
      return handleError(res, 500, error.message);
    }
  };
  

  
  
  

export {
  getCommentsByPost,
  getReplies,
  addComment,
  addReply,
  likeComment,
  unlikeComment,
};
