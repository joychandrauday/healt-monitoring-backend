"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentRoutes = void 0;
// appointment/routes.ts
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const role_1 = require("../../middleware/role");
const router = (0, express_1.Router)();
router.post('/', auth_1.authMiddleware, (0, role_1.roleMiddleware)(['patient']), controller_1.createAppointment);
router.get('/', auth_1.authMiddleware, (0, role_1.roleMiddleware)(['admin']), controller_1.getAllAppointments);
router.get('/:userId', auth_1.authMiddleware, (0, role_1.roleMiddleware)(['patient', 'doctor']), controller_1.getAppointments);
router.get('/single/:id', auth_1.authMiddleware, controller_1.getAppointment);
router.put('/:id', auth_1.authMiddleware, (0, role_1.roleMiddleware)(['doctor', 'admin']), controller_1.updateAppointment);
router.delete('/:id', auth_1.authMiddleware, (0, role_1.roleMiddleware)(['patient', 'doctor', 'admin']), controller_1.deleteAppointment);
exports.appointmentRoutes = router;
