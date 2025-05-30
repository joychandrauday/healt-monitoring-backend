import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { roleMiddleware } from '../../middleware/role';
import {
    registerDoctor,
    loginDoctor,
    getDoctor,
    updateDoctor,
    deleteDoctor,
    getAllDoctors
} from './controller';

const router = Router();

router.post('/register/:id', authMiddleware, registerDoctor); // Extends existing user by id
router.post('/login', loginDoctor);
router.get('/:id', getDoctor);
router.put('/:id', authMiddleware, updateDoctor);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), deleteDoctor);
router.get('/', authMiddleware, getAllDoctors);

export const doctorRoutes = router;
