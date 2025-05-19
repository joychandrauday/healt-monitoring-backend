import { Router } from 'express';
import { getChatHistory, sendMessage } from './controller';
import { authMiddleware } from '../../middleware/auth';
import { roleMiddleware } from '../../middleware/role';

const router = Router();

router.get('/:userId', authMiddleware, roleMiddleware(['patient', 'doctor']), getChatHistory);
router.post('/', authMiddleware, roleMiddleware(['patient', 'doctor']), sendMessage);

export const chatRoutes = router;