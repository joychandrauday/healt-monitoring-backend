"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const route_1 = require("./app/modules/user/route");
const route_2 = require("./app/modules/vitals/route");
const route_3 = require("./app/modules/appointment/route");
const route_4 = require("./app/modules/chat/route");
const route_5 = require("./app/modules/analytics/route");
const dotenv_1 = __importDefault(require("dotenv"));
const os_1 = __importDefault(require("os"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const globalErrorHandler_1 = require("./app/utils/globalErrorHandler");
const route_6 = require("./app/modules/doctor/route");
const routes_1 = require("./app/modules/notification/routes");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Allowed origins
const allowedOrigins = [
    'http://localhost:3000',
];
// CORS middleware
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
app.options('*', (0, cors_1.default)());
app.use(express_1.default.json());
app.use(body_parser_1.default.json());
// Root route for testing
app.get('/', (req, res) => {
    var _a;
    const currentDateTime = new Date().toISOString();
    const clientIp = req.headers['x-forwarded-for'] ||
        ((_a = (req.socket)) === null || _a === void 0 ? void 0 : _a.remoteAddress);
    const serverHostname = os_1.default.hostname();
    const serverPlatform = os_1.default.platform();
    const uptime = os_1.default.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    res.status(200).json({
        success: true,
        message: 'Welcome to Remote Health Monitoring Server by Joy Chandra Uday',
        version: '1.0.0',
        clientDetails: {
            ipAddress: clientIp,
            accessedAt: currentDateTime,
        },
        serverDetails: {
            hostname: serverHostname,
            platform: serverPlatform,
            uptime: `${hours} hours ${minutes} minutes`,
        },
        developerContact: {
            email: 'joychandraud@gmail.com',
            website: 'https://joychandrauday-nexus.vercel.app',
        },
    });
});
// Route setup
app.use('/api/v1/users', route_1.userRoutes);
app.use('/api/v1/doctors', route_6.doctorRoutes);
app.use('/api/v1/vitals', route_2.vitalsRoutes);
app.use('/api/v1/appointments', route_3.appointmentRoutes);
app.use('/api/v1/chats', route_4.chatRoutes);
app.use('/api/v1/analytics', route_5.analyticsRoutes);
app.use('/api/v1/notifications', routes_1.notificationRoutes);
// Global error handler
app.use((err, req, res, next) => {
    (0, globalErrorHandler_1.globalErrorHandler)(err, req, res, next);
});
exports.default = app;
