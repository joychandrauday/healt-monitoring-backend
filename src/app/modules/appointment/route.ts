
// appointment/routes.ts
import { Router } from 'express';
import { createAppointment, getAllAppointments, getAppointments, updateAppointment, deleteAppointment, getAppointment } from './controller';
import { authMiddleware } from '../../middleware/auth';
import { roleMiddleware } from '../../middleware/role';

const router = Router();

router.post('/', authMiddleware, roleMiddleware(['patient']), createAppointment);
router.get('/', authMiddleware, roleMiddleware(['admin']), getAllAppointments);
router.get('/:userId', authMiddleware, roleMiddleware(['patient', 'doctor']), getAppointments);
router.get('/single/:id', authMiddleware, getAppointment);
router.put('/:id', authMiddleware, roleMiddleware(['doctor', 'admin']), updateAppointment);
router.delete('/:id', authMiddleware, roleMiddleware(['patient', 'doctor', 'admin']), deleteAppointment);

export const appointmentRoutes = router;