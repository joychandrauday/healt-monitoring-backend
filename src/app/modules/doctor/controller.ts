import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import sendResponse from '../../utils/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { DoctorService } from './service';

const doctorService = new DoctorService();

export const registerDoctor = asyncHandler(async (req: Request, res: Response) => {
    console.log(req.params.id);
    const { doctor, token } = await doctorService.registerDoctor(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: 'Doctor registered successfully',
        data: { doctor, token },
    });
});

export const loginDoctor = asyncHandler(async (req: Request, res: Response) => {
    const { doctor, token } = await doctorService.loginDoctor(req.body.email, req.body.password);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Login successful',
        data: { doctor, token },
    });
});

export const getDoctor = asyncHandler(async (req: Request, res: Response) => {
    const doctor = await doctorService.getDoctorById(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Doctor retrieved successfully',
        data: doctor,
    });
});

export const updateDoctor = asyncHandler(async (req: Request, res: Response) => {
    const doctor = await doctorService.updateDoctor(req.params.id, req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Doctor updated successfully',
        data: doctor,
    });
});

export const deleteDoctor = asyncHandler(async (req: Request, res: Response) => {
    await doctorService.deleteDoctor(req.params.id);
    res.status(StatusCodes.NO_CONTENT).send();
});

export const getAllDoctors = asyncHandler(async (req: Request, res: Response) => {
    const { doctors, meta } = await doctorService.getAllDoctors(req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Doctors retrieved successfully',
        data: { doctors, meta },
    });
});
