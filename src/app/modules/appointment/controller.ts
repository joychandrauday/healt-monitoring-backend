
// appointment/controller.ts
import { Request, Response } from 'express';
import { AppointmentService } from './service';
import { asyncHandler } from '../../utils/asyncHandler';
import { CustomRequest } from '../../types';
import sendResponse from '../../utils/sendResponse';
import { StatusCodes } from 'http-status-codes';

const appointmentService = new AppointmentService();

export const createAppointment = asyncHandler(async (req: CustomRequest, res: Response) => {
    const appointment = await appointmentService.createAppointment({
        ...req.body,
        patientId: req.user!.id,
    });
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: 'Appointment created successfully!',
        data: appointment,
    });
});

export const getAllAppointments = asyncHandler(async (req: Request, res: Response) => {
    const appointments = await appointmentService.getAppointments(req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Appointments retrieved successfully!',
        data: appointments,
    });
});

export const getAppointments = asyncHandler(async (req: Request, res: Response) => {
    const appointments = await appointmentService.getAppointmentsByUserId(req.params.userId, req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'User appointments retrieved successfully!',
        data: appointments,
    });
});

export const updateAppointment = asyncHandler(async (req: Request, res: Response) => {
    const appointment = await appointmentService.updateAppointment(req.params.id, req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Appointment updated successfully!',
        data: appointment,
    });
});

export const deleteAppointment = asyncHandler(async (req: Request, res: Response) => {
    await appointmentService.deleteAppointment(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Appointment deleted successfully!',
    });
});
export const getAppointment = asyncHandler(async (req: Request, res: Response) => {
    const vital = await appointmentService.getSingleAppointment(req.params.id);
    res.status(200).json(vital);
});