import { Request, Response } from 'express';
import { AppointmentService } from './service';
import { asyncHandler } from '../../utils/asyncHandler';
import { CustomRequest } from '../../types';
import sendResponse from '../../utils/sendResponse';
import { StatusCodes } from 'http-status-codes';

const appointmentService = new AppointmentService();

export const createAppointment = asyncHandler(async (req: CustomRequest, res: Response) => {
    console.log(req.body);
    console.log(req.user);
    const appointment = await appointmentService.createAppointment({
        ...req.body,
        patientId: req.user!.id,
    });
    sendResponse(res, {
        statusCode: StatusCodes.ACCEPTED,
        success: true,
        message: "Appointment Created successfully!",
        data: appointment,
    });
});

export const getAllAppointments = asyncHandler(async (req: Request, res: Response) => {
    const appointments = await appointmentService.getAppointments(req.query);
    sendResponse(res, {
        statusCode: StatusCodes.ACCEPTED,
        success: true,
        message: "Appointment Created successfully!",
        data: appointments,
    });
});
export const getAppointments = asyncHandler(async (req: Request, res: Response) => {
    const appointments = await appointmentService.getAppointmentsByUserId(req.params.userId, req.query);
    sendResponse(res, {
        statusCode: StatusCodes.ACCEPTED,
        success: true,
        message: "Appointment Created successfully!",
        data: appointments,
    });
});

export const updateAppointment = asyncHandler(async (req: Request, res: Response) => {
    const appointment = await appointmentService.updateAppointment(req.params.id, req.body);
    sendResponse(res, {
        statusCode: StatusCodes.ACCEPTED,
        success: true,
        message: "Appointment Status Updated successfully!",
        data: appointment,
    });
});

export const deleteAppointment = asyncHandler(async (req: Request, res: Response) => {
    await appointmentService.deleteAppointment(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.ACCEPTED,
        success: true,
        message: "Appointment deleted successfully!",
    });
});