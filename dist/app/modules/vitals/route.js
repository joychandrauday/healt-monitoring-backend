"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vitalsRoutes = void 0;
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const role_1 = require("../../middleware/role");
const router = (0, express_1.Router)();
router.post('/', auth_1.authMiddleware, (0, role_1.roleMiddleware)(['patient']), controller_1.submitVital);
router.get('/:patientId', auth_1.authMiddleware, (0, role_1.roleMiddleware)(['patient', 'doctor']), controller_1.getVitals);
router.get('/doctor/:doctorId', auth_1.authMiddleware, (0, role_1.roleMiddleware)(['patient', 'doctor']), controller_1.getVitalsByDoctor);
router.get('/patients/:doctorId', controller_1.getPatientsByDoctorId);
router.get('/single/:id', auth_1.authMiddleware, (0, role_1.roleMiddleware)(['patient', 'doctor']), controller_1.getVital);
router.put('/:id', auth_1.authMiddleware, (0, role_1.roleMiddleware)(['patient']), controller_1.updateVital);
router.delete('/:id', auth_1.authMiddleware, (0, role_1.roleMiddleware)(['patient']), controller_1.deleteVital);
router.patch("/:id/prescriptions/add", auth_1.authMiddleware, controller_1.feedbackController.addPrescription);
router.patch("/:id/prescriptions/delete", auth_1.authMiddleware, controller_1.feedbackController.deletePrescription);
router.patch("/:id/prescriptions/update", auth_1.authMiddleware, controller_1.feedbackController.updatePrescription);
// Routes for lab tests
router.patch("/:id/labTests/add", auth_1.authMiddleware, controller_1.feedbackController.addLabTest);
router.patch("/:id/labTests/delete", auth_1.authMiddleware, controller_1.feedbackController.deleteLabTest);
router.patch("/:id/labTests/update", auth_1.authMiddleware, controller_1.feedbackController.updateLabTest);
// For recommendations
router.put("/:id/recommendation", auth_1.authMiddleware, controller_1.updateRecommendation);
exports.vitalsRoutes = router;
