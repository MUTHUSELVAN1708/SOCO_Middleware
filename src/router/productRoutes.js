import express from 'express';
import { createAndUpdateProduct,getProductDetail,deleteProducts,
    getProductCategories,deactivateProduct ,getProduct,
    getProductFilters,getBusinessAnalytics,visitPage,getProductById} from '../controller/ProductController.js';

const router = express.Router();

router.get('/product/:productId', getProductDetail);
router.get('/getProductById/:productId', getProductById);
router.post('/addProduct', createAndUpdateProduct);
router.put('/updateProduct/:productId',createAndUpdateProduct);
router.delete('/deleteProducts',deleteProducts);
router.get("/getProductCategories",getProductCategories)
router.post("/getProduct",getProduct)
router.get("/getProductFilters",getProductFilters)

router.get("/analytics",getBusinessAnalytics);
router.put("/De-ActivateProdct",deactivateProduct);
// =========deactivateProduct
router.post("/visitPage",visitPage);
export default router;