import { Router } from 'express';
import { submitVital, getVitals, getVital, updateVital, deleteVital, getVitalsByDoctor, getPatientsByDoctorId, feedbackController, updateRecommendation } from './controller';
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


router.patch("/:id/prescriptions/add", authMiddleware, feedbackController.addPrescription);
router.patch("/:id/prescriptions/delete", authMiddleware, feedbackController.deletePrescription);
router.patch("/:id/prescriptions/update", authMiddleware, feedbackController.updatePrescription);

// Routes for lab tests
router.patch("/:id/labTests/add", authMiddleware, feedbackController.addLabTest);
router.patch("/:id/labTests/delete", authMiddleware, feedbackController.deleteLabTest);
router.patch("/:id/labTests/update", authMiddleware, feedbackController.updateLabTest);
// For recommendations
router.put("/:id/recommendation", authMiddleware, updateRecommendation);

export const vitalsRoutes = router;