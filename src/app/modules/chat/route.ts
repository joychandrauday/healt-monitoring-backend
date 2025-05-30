import { Router } from 'express';
import { getChatHistory, getUniqueSenders, sendMessage } from './controller';
import { authMiddleware } from '../../middleware/auth';
import { roleMiddleware } from '../../middleware/role';

const router = Router();

router.get('/:senderId/:receiverId', authMiddleware, getChatHistory);
router.get('/:receiverId', authMiddleware, getUniqueSenders);
router.post('/', authMiddleware, sendMessage);

export const chatRoutes = router;