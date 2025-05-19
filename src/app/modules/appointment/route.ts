import { Router } from 'express';
import { createAppointment, getAppointments, updateAppointment, deleteAppointment } from './controller';
import { authMiddleware } from '../../middleware/auth';
import { roleMiddleware } from '../../middleware/role';

const router = Router();

router.post('/', authMiddleware, roleMiddleware(['patient']), createAppointment);
router.get('/', authMiddleware, roleMiddleware(['admin']), getAppointments);
router.get('/:userId', authMiddleware, roleMiddleware(['patient', 'doctor']), getAppointments);
router.put('/:id', authMiddleware, roleMiddleware(['doctor']), updateAppointment);
router.delete('/:id', authMiddleware, roleMiddleware(['patient', 'doctor']), deleteAppointment);

export const appointmentRoutes = router;