import express from 'express';
import { createAndUpdateProduct,getProductDetail,deleteProducts } from '../controller/ProductController.js';

const router = express.Router();

router.get('/product/:productId', getProductDetail);
router.post('/addProduct', createAndUpdateProduct);
router.put('/updateProduct/:productId',createAndUpdateProduct);
router.delete('/deleteProducts',deleteProducts);

export default router;