"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doctorRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const role_1 = require("../../middleware/role");
const controller_1 = require("./controller");
const router = (0, express_1.Router)();
router.post('/register/:id', auth_1.authMiddleware, controller_1.registerDoctor); // Extends existing user by id
router.post('/login', controller_1.loginDoctor);
router.get('/:id', auth_1.authMiddleware, controller_1.getDoctor);
router.put('/:id', auth_1.authMiddleware, controller_1.updateDoctor);
router.delete('/:id', auth_1.authMiddleware, (0, role_1.roleMiddleware)(['admin']), controller_1.deleteDoctor);
router.get('/', auth_1.authMiddleware, controller_1.getAllDoctors);
exports.doctorRoutes = router;
