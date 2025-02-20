import express from 'express';
import { 
  getCommentsByPost, 
  getReplies, 
  addComment, 
  addReply, 
  likeComment, 
  unlikeComment 
} from '../controller/commentController.js';
console.log('before api');
const router = express.Router();



router.post('/post/:postId/comments', getCommentsByPost);
router.post('/:commentId/replies', getReplies);
router.post('/:postId/comments', addComment);
router.post('/:commentId/addReply', addReply);

router.post('/:commentId/like', likeComment);
router.post('/:commentId/unlike', unlikeComment);



export default router;
