import { Request, Response } from 'express';
import { VitalsService } from './service';
import { asyncHandler } from '../../utils/asyncHandler';
import { CustomRequest } from '../../types';
import sendResponse from '../../utils/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { io } from '../../../server';

const vitalsService = new VitalsService();
export const submitVital = asyncHandler(async (req: CustomRequest, res: Response) => {
    const vital = await vitalsService.createVital({
        ...req.body,
        patientId: req.user!.id,
    });

    console.log('Vital created:', vital);
    console.log('Emitting to rooms:', `patient:${vital.patientId}`, `doctor:${vital.doctorId}`);

    // Emit vital:new to patient and doctor
    io.to(`patient:${vital.patientId}`)
        .to(`doctor:${vital.doctorId}`)
        .emit('vital:new', {
            sender: vital.patientId, // Changed from patientId to sender to match frontend
            vitalId: vital._id,
            vital,
        });

    // Emit vital:submitted to patient
    io.to(`patient:${vital.patientId}`).emit('vital:submitted', vital);

    // Check for critical vitals
    let alertMessage = null;
    if (vital.heartRate && (vital.heartRate > 100 || vital.heartRate < 60)) {
        alertMessage = `Critical Heart Rate: ${vital.heartRate} bpm`;
    } else if (vital.bloodPressure && (vital.bloodPressure.systolic > 140 || vital.bloodPressure.diastolic > 90)) {
        alertMessage = `Critical BP: ${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic} mmHg`;
    }

    if (alertMessage) {
        console.log('Emitting vital:alert to doctor:', `doctor:${vital.doctorId}`);
        io.to(`doctor:${vital.doctorId}`).emit('vital:alert', {
            sender: vital.patientId, // Changed from patientId to sender to match frontend
            vitalId: vital._id,
            message: alertMessage,
            vital,
        });
    }

    sendResponse(res, {
        statusCode: StatusCodes.ACCEPTED,
        success: true,
        message: 'Vital Submitted successfully!!',
        data: vital,
    });
});

export const getVitals = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query;
    const result = await vitalsService.getVitalsByPatientId(req.params.patientId, query);
    sendResponse(res, {
        statusCode: StatusCodes.ACCEPTED,
        success: true,
        message: "Vitals Retrieved successfully",
        data: result,
    });
});
export const getVitalsByDoctor = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query;
    const result = await vitalsService.getVitalsByDoctorId(req.params.doctorId, query);
    sendResponse(res, {
        statusCode: StatusCodes.ACCEPTED,
        success: true,
        message: "Vitals Retrieved successfully",
        data: result,
    });
});

export const getVital = asyncHandler(async (req: Request, res: Response) => {
    const vital = await vitalsService.getVitalById(req.params.id);
    res.status(200).json(vital);
});

export const updateVital = asyncHandler(async (req: Request, res: Response) => {
    const vital = await vitalsService.updateVital(req.params.id, req.body);
    res.status(200).json(vital);
});

export const deleteVital = asyncHandler(async (req: Request, res: Response) => {
    await vitalsService.deleteVital(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.ACCEPTED,
        success: true,
        message: "Vital deleted successfully",
    });
});

export const getPatientsByDoctorId = async (req: Request, res: Response) => {
    try {
        const { doctorId } = req.params;
        const patients = await vitalsService.getPatientsByDoctorId(doctorId);
        res.status(200).json({
            success: true,
            data: patients,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'An error occurred',
        });
    }
};