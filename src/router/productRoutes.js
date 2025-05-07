import express from 'express';
import { createAndUpdateProduct,getProductDetail,deleteProducts,getProductCategories ,getProduct,getProductFilters} from '../controller/ProductController.js';

const router = express.Router();

router.get('/product/:productId', getProductDetail);
router.post('/addProduct', createAndUpdateProduct);
router.put('/updateProduct/:productId',createAndUpdateProduct);
router.delete('/deleteProducts',deleteProducts);
router.get("/getProductCategories",getProductCategories)
router.get("/getProduct",getProduct)
router.get("/getProductFilters",getProductFilters)


export default router;