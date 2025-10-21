import { Router } from 'express';
import { orderController } from '../controllers/order.controller';

const router = Router();

router.post('/', (req, res, next) => orderController.createOrder(req, res, next));
router.get('/', (req, res, next) => orderController.getUserOrders(req, res, next));
router.get('/stats', (req, res, next) => orderController.getOrderStatistics(req, res, next));
router.get('/:orderId', (req, res, next) => orderController.getOrderById(req, res, next));
router.get('/number/:orderNumber', (req, res, next) => orderController.getOrderByNumber(req, res, next));
router.post('/:orderId/cancel', (req, res, next) => orderController.cancelOrder(req, res, next));

export default router;
