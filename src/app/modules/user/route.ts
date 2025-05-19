import { Router } from 'express';
import { registerUser, loginUser, getUser, updateUser, deleteUser, getAllUsers } from './controller';
import { authMiddleware } from '../../middleware/auth';
import { roleMiddleware } from '../../middleware/role';

const router = Router();

router.post('/register', registerUser); // Open for registration
router.post('/login', loginUser); // Open for login
router.get('/:id', authMiddleware, getUser);
router.patch('/:id', authMiddleware, updateUser);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), deleteUser);
router.get('/', authMiddleware, roleMiddleware(['admin']), getAllUsers);

export const userRoutes = router;