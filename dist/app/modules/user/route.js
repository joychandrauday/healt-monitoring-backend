"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const controller_1 = require("./controller");
const auth_1 = require("../../middleware/auth");
const role_1 = require("../../middleware/role");
const router = (0, express_1.Router)();
router.post('/register', controller_1.registerUser); // Open for registration
router.post('/login', controller_1.loginUser); // Open for login
router.get('/:id', auth_1.authMiddleware, controller_1.getUser);
router.patch('/:id', auth_1.authMiddleware, controller_1.updateUser);
router.delete('/:id', auth_1.authMiddleware, (0, role_1.roleMiddleware)(['admin']), controller_1.deleteUser);
router.get('/', auth_1.authMiddleware, (0, role_1.roleMiddleware)(['admin']), controller_1.getAllUsers);
exports.userRoutes = router;
