import { Request, Response } from 'express';
import { AnalyticsService } from './service';
import { asyncHandler } from '../../utils/asyncHandler';

const analyticsService = new AnalyticsService();

export const getVitalTrends = asyncHandler(async (req: Request, res: Response) => {
    const trends = await analyticsService.getVitalTrends(req.params.patientId, req.query.period as string);
    res.status(200).json(trends);
});

export const generateReport = asyncHandler(async (req: Request, res: Response) => {
    const report = await analyticsService.generateReport(req.body.patientId, req.body.period);
    res.status(200).json(report);
});