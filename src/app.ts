import express, { NextFunction, Request, Response } from 'express';
import { userRoutes } from './app/modules/user/route';
import { vitalsRoutes } from './app/modules/vitals/route';
import { appointmentRoutes } from './app/modules/appointment/route';
import { chatRoutes } from './app/modules/chat/route';
import { analyticsRoutes } from './app/modules/analytics/route';
import { errorMiddleware } from './app/middleware/error';
import dotenv from 'dotenv';
import os from 'os';
import cors from 'cors';
import bodyParser from 'body-parser';
import { globalErrorHandler } from './app/utils/globalErrorHandler';
import { doctorRoutes } from './app/modules/doctor/route';
import { notificationRoutes } from './app/modules/notification/routes';

dotenv.config();

const app = express();

// Allowed origins
const allowedOrigins = [
    'http://localhost:3000',
];

// CORS middleware
app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'), false);
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    })
);

app.options('*', cors());

app.use(express.json());
app.use(bodyParser.json());

// Root route for testing
app.get('/', (req: Request, res: Response) => {
    const currentDateTime = new Date().toISOString();
    const clientIp =
        (req.headers['x-forwarded-for'] as string) ||
        (req.socket)?.remoteAddress;

    const serverHostname = os.hostname();
    const serverPlatform = os.platform();
    const uptime = os.uptime();
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
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/vitals', vitalsRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/chats', chatRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/notifications', notificationRoutes);
// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    globalErrorHandler(err, req, res, next);
});

export default app;
