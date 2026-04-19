// backend/src/routes/statsRoutes.js
import express from 'express';
import {
    getCounterMetrics,
    getGlobalEmployeeStats
} from '../controllers/statsController.js';

const router = express.Router();

router.get('/stats/contador/:userId', getCounterMetrics);
router.get('/stats/global/:userId', getGlobalEmployeeStats);

export default router;