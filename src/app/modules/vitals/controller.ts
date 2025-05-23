import { Request, Response } from 'express';
import { VitalsService } from './service';
import { asyncHandler } from '../../utils/asyncHandler';
import { CustomRequest } from '../../types';
import sendResponse from '../../utils/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { io } from '../../../server';
import { NotificationService } from '../notification/service';
import { NotFoundError } from '../../utils/error';

const vitalsService = new VitalsService();
const notificationService = new NotificationService();

// Define interfaces for request data
interface Prescription {
    medication: string;
    brandName?: string;
    dosage: string;
    duration: string;
    instructions?: string;
}

interface LabTest {
    testName: string;
    urgency: "routine" | "urgent";
    notes?: string;
    scheduledDate?: string;
    labLocation?: string;
    status?: "pending" | "completed" | "cancelled";
    resultLink?: string;
    physicianNote?: string;
}

interface AddPrescriptionBody {
    data: Prescription;
}

interface DeletePrescriptionBody {
    data: Partial<Prescription>;
}

interface UpdatePrescriptionBody {
    match: Partial<Prescription>;
    update: Partial<Prescription>;
}

interface AddLabTestBody {
    data: LabTest;
}

interface DeleteLabTestBody {
    data: Partial<LabTest>;
}

interface UpdateLabTestBody {
    match: Partial<LabTest>;
    update: Partial<LabTest>;
}

export const submitVital = asyncHandler(async (req: CustomRequest, res: Response) => {
    const vital = await vitalsService.createVital({
        ...req.body,
        patientId: req.user!.id,
    });

    // Create the notification in the backend
    const notification = await notificationService.createNotification({
        receiver: vital.doctorId.toString(),
        sender: vital.patientId.toString(),
        type: 'vital',
        foreignId: vital._id,
        message: 'New vital submitted',
        url: `/doctor/dashboard/vitals/${vital.patientId}/${vital._id}`,
    });
    console.log(notification);
    console.log('Vital created:', vital);
    console.log('Notification created:', notification);
    console.log('Emitting to rooms:', `patient:${vital.patientId}`, `doctor:${vital.doctorId}`);

    // Emit vital:new with the notification data
    io.to(`patient:${vital.patientId}`)
        .to(`doctor:${vital.doctorId}`)
        .emit('vital:new', {
            sender: vital.patientId,
            vitalId: vital._id,
            vital,
            notification, // Include the notification
        });

    // Emit vital:submitted to patient
    io.to(`patient:${vital.patientId}`).emit('vital:submitted', vital);

    // Handle critical vitals (optional: create a separate notification if needed)
    let alertMessage = null;
    if (vital.heartRate && (vital.heartRate > 100 || vital.heartRate < 60)) {
        alertMessage = `Critical Heart Rate: ${vital.heartRate} bpm`;
    } else if (vital.bloodPressure && (vital.bloodPressure.systolic > 140 || vital.bloodPressure.diastolic > 90)) {
        alertMessage = `Critical BP: ${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic} mmHg`;
    }

    if (alertMessage) {
        io.to(`doctor:${vital.doctorId}`).emit('vital:alert', {
            sender: vital.patientId,
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
export const updateRecommendation = asyncHandler(async (req: Request, res: Response) => {
    const vital = await vitalsService.addRecommendation(req.params.id, req.body.recommendations);
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

// feedback controller section
export class feedbackController {
    // Prescriptions: Add
    static addPrescription = asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { data }: AddPrescriptionBody = req.body;

        // Validate input
        if (!data || !data.medication || !data.dosage || !data.duration) {
            throw new NotFoundError("Invalid prescription data: medication, dosage, and duration are required");
        }

        try {
            const vital = await vitalsService.addPrescription(id, data);
            // Create notification

            const notification = await notificationService.createNotification({
                receiver: vital.patientId.toString(),
                sender: req.user!.id, // Assuming doctor is the authenticated user
                type: 'vital_feedback',
                foreignId: vital._id,
                message: `New prescription added: ${data.medication}`,
                url: `/patient/dashboard/vitals/${vital._id}`,
            });
            // Emit Socket.IO event
            io.to(`patient:${vital.patientId}`)
                .to(`doctor:${vital.doctorId}`)
                .emit('vital:feedback', {
                    sender: req.user!.id,
                    vitalId: vital._id,
                    message: `New prescription added: ${data.medication}`,
                    vital,
                    notification,
                });

            sendResponse(res, {
                statusCode: StatusCodes.OK,
                success: true,
                message: "Prescription added successfully",
                data: vital,
            });
        } catch (error: any) {
            console.log(error);
            throw new NotFoundError(error.message || "Failed to add prescription");
        }
    });

    // Prescriptions: Delete
    static deletePrescription = asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { data }: DeletePrescriptionBody = req.body;

        // Validate input
        if (!data || !data.medication) {
            throw new NotFoundError("Invalid prescription data: medication is required for deletion");
        }

        try {
            const vital = await vitalsService.deletePrescription(id, data);
            sendResponse(res, {
                statusCode: StatusCodes.OK,
                success: true,
                message: "Prescription deleted successfully",
                data: vital,
            });
        } catch (error: any) {
            throw new NotFoundError(error.message || "Failed to delete prescription");
        }
    });

    // Prescriptions: Update
    static updatePrescription = asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { match, update }: UpdatePrescriptionBody = req.body;

        // Validate input
        if (!match || !match.medication) {
            throw new NotFoundError("Match criteria must include medication for prescriptions");
        }
        if (!update) {
            throw new NotFoundError("Update data is required");
        }

        try {
            const vital = await vitalsService.updatePrescription(id, match, update);

            // Create notification
            const notification = await notificationService.createNotification({
                receiver: vital.patientId.toString(),
                sender: req.user!.id,
                type: 'vital_feedback',
                message: `Prescription updated: ${match.medication}`,
                foreignId: vital._id,
                url: `/patient/dashboard/vitals/${vital._id}`,
            });

            // Emit Socket.IO event
            io.to(`patient:${vital.patientId}`)
                .to(`doctor:${vital.doctorId}`)
                .emit('vital:feedback', {
                    sender: req.user!.id,
                    vitalId: vital._id,
                    message: `Prescription updated: ${match.medication}`,
                    vital,
                    notification,
                });

            sendResponse(res, {
                statusCode: StatusCodes.OK,
                success: true,
                message: "Prescription updated successfully",
                data: vital,
            });
        } catch (error: any) {
            throw new NotFoundError(error.message || "Failed to update prescription");
        }
    });

    // Lab Tests: Add
    static addLabTest = asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { data }: AddLabTestBody = req.body;

        // Validate input
        if (!data || !data.testName || !data.urgency) {
            throw new NotFoundError("Invalid lab test data: testName and urgency are required");
        }

        try {
            const vital = await vitalsService.addLabTest(id, data);

            // Create notification
            const notification = await notificationService.createNotification({
                receiver: vital.patientId.toString(),
                sender: req.user!.id,
                type: 'vital_feedback',
                foreignId: vital._id,
                message: `New lab test added: ${data.testName}`,
                url: `/patient/dashboard/vitals/${vital._id}`,
            });

            // Emit Socket.IO event
            io.to(`patient:${vital.patientId}`)
                .to(`doctor:${vital.doctorId}`)
                .emit('vital:feedback', {
                    sender: req.user!.id,
                    vitalId: vital._id,
                    message: `New lab test added: ${data.testName}`,
                    vital,
                    notification,
                });

            sendResponse(res, {
                statusCode: StatusCodes.OK,
                success: true,
                message: "Lab test added successfully",
                data: vital,
            });
        } catch (error: any) {
            throw new NotFoundError(error.message || "Failed to add lab test");
        }
    });

    // Lab Tests: Delete
    static deleteLabTest = asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { data }: DeleteLabTestBody = req.body;

        // Validate input
        if (!data || !data.testName) {
            throw new NotFoundError("Invalid lab test data: testName is required for deletion");
        }

        try {
            const vital = await vitalsService.deleteLabTest(id, data);

            // Create notification
            const notification = await notificationService.createNotification({
                receiver: vital.patientId.toString(),
                sender: req.user!.id,
                type: 'vital_feedback',
                foreignId: vital._id,
                message: `Lab test deleted: ${data.testName}`,
                url: `/patient/dashboard/vitals/${vital._id}`,
            });

            // Emit Socket.IO event
            io.to(`patient:${vital.patientId}`)
                .to(`doctor:${vital.doctorId}`)
                .emit('vital:feedback', {
                    sender: req.user!.id,
                    vitalId: vital._id,
                    message: `Lab test deleted: ${data.testName}`,
                    vital,
                    notification,
                });

            sendResponse(res, {
                statusCode: StatusCodes.OK,
                success: true,
                message: "Lab test deleted successfully",
                data: vital,
            });
        } catch (error: any) {
            throw new NotFoundError(error.message || "Failed to delete lab test");
        }
    });

    // Lab Tests: Update
    static updateLabTest = asyncHandler(async (req: CustomRequest, res: Response) => {
        const { id } = req.params;
        const { match, update }: UpdateLabTestBody = req.body;

        // Validate input
        if (!match || !match.testName) {
            throw new NotFoundError("Match criteria must include testName for lab tests");
        }
        if (!update) {
            throw new NotFoundError("Update data is required");
        }

        try {
            const vital = await vitalsService.updateLabTest(id, match, update);

            // Create notification
            const notification = await notificationService.createNotification({
                receiver: vital.patientId.toString(),
                sender: req.user!.id,
                type: 'vital_feedback',
                foreignId: vital._id,
                message: `Lab test updated: ${match.testName}`,
                url: `/patient/dashboard/vitals/${vital._id}`,
            });

            // Emit Socket.IO event
            io.to(`patient:${vital.patientId}`)
                .to(`doctor:${vital.doctorId}`)
                .emit('vital:feedback', {
                    sender: req.user!.id,
                    vitalId: vital._id,
                    message: `Lab test updated: ${match.testName}`,
                    vital,
                    notification,
                });

            sendResponse(res, {
                statusCode: StatusCodes.OK,
                success: true,
                message: "Lab test updated successfully",
                data: vital,
            });
        } catch (error: any) {
            throw new NotFoundError(error.message || "Failed to update lab test");
        }
    });
}