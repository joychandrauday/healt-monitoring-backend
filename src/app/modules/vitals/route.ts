import { Router } from 'express';
import { submitVital, getVitals, getVital, updateVital, deleteVital, getVitalsByDoctor, getPatientsByDoctorId } from './controller';
import { authMiddleware } from '../../middleware/auth';
import { roleMiddleware } from '../../middleware/role';

const router = Router();

router.post('/', authMiddleware, roleMiddleware(['patient']), submitVital);
router.get('/:patientId', authMiddleware, roleMiddleware(['patient', 'doctor']), getVitals);
router.get('/doctor/:doctorId', authMiddleware, roleMiddleware(['patient', 'doctor']), getVitalsByDoctor);
router.get('/patients/:doctorId', getPatientsByDoctorId);
router.get('/single/:id', authMiddleware, roleMiddleware(['patient', 'doctor']), getVital);
router.put('/:id', authMiddleware, roleMiddleware(['patient']), updateVital);
router.delete('/:id', authMiddleware, roleMiddleware(['patient']), deleteVital);

export const vitalsRoutes = router;