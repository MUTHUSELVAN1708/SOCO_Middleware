import express from 'express';
import { createAndUpdateProduct,getProductDetail,deleteProducts,getProductCategories,getProduct } from '../controller/ProductController.js';

const router = express.Router();

router.get('/product/:productId', getProductDetail);
router.post('/addProduct', createAndUpdateProduct);
router.put('/updateProduct/:productId',createAndUpdateProduct);
router.delete('/deleteProducts',deleteProducts);

router.get("/getProductCtegories",getProductCategories)
router.get("/getProduct",getProduct)

export default router;