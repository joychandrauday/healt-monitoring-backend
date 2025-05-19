import { Router } from 'express';
import { getVitalTrends, generateReport } from './controller';
import { authMiddleware } from '../../middleware/auth';
import { roleMiddleware } from '../../middleware/role';

const router = Router();

router.get('/:patientId', authMiddleware, roleMiddleware(['patient', 'doctor']), getVitalTrends);
router.post('/report', authMiddleware, roleMiddleware(['doctor']), generateReport);

export const analyticsRoutes = router;