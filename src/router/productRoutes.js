import express from 'express';
import { createAndUpdateProduct,getProductDetail,deleteProducts,getProductCategories ,getProduct,getProductFilters,getBusinessAnalytics,visitPage} from '../controller/ProductController.js';

const router = express.Router();

router.get('/product/:productId', getProductDetail);
router.post('/addProduct', createAndUpdateProduct);
router.put('/updateProduct/:productId',createAndUpdateProduct);
router.delete('/deleteProducts',deleteProducts);
router.get("/getProductCategories",getProductCategories)
router.post("/getProduct",getProduct)
router.get("/getProductFilters",getProductFilters)

router.get("/analytics/:business_id",getBusinessAnalytics);

// =========visitor
router.post("/visitPage",visitPage)
export default router;