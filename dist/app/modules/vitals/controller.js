"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPatientsByDoctorId = exports.deleteVital = exports.updateVital = exports.getVital = exports.getVitalsByDoctor = exports.getVitals = exports.submitVital = void 0;
const service_1 = require("./service");
const asyncHandler_1 = require("../../utils/asyncHandler");
const sendResponse_1 = __importDefault(require("../../utils/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const server_1 = require("../../../server");
const service_2 = require("../notification/service");
const vitalsService = new service_1.VitalsService();
const notificationService = new service_2.NotificationService();
exports.submitVital = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const vital = yield vitalsService.createVital(Object.assign(Object.assign({}, req.body), { patientId: req.user.id }));
    // Create the notification in the backend
    const notification = yield notificationService.createNotification({
        receiver: vital.doctorId.toString(),
        sender: vital.patientId.toString(),
        type: 'vital',
        message: 'New vital submitted',
        url: `/doctor/dashboard/vitals/${vital.patientId}/${vital._id}`,
    });
    console.log('Vital created:', vital);
    console.log('Notification created:', notification);
    console.log('Emitting to rooms:', `patient:${vital.patientId}`, `doctor:${vital.doctorId}`);
    // Emit vital:new with the notification data
    server_1.io.to(`patient:${vital.patientId}`)
        .to(`doctor:${vital.doctorId}`)
        .emit('vital:new', {
        sender: vital.patientId,
        vitalId: vital._id,
        vital,
        notification, // Include the notification
    });
    // Emit vital:submitted to patient
    server_1.io.to(`patient:${vital.patientId}`).emit('vital:submitted', vital);
    // Handle critical vitals (optional: create a separate notification if needed)
    let alertMessage = null;
    if (vital.heartRate && (vital.heartRate > 100 || vital.heartRate < 60)) {
        alertMessage = `Critical Heart Rate: ${vital.heartRate} bpm`;
    }
    else if (vital.bloodPressure && (vital.bloodPressure.systolic > 140 || vital.bloodPressure.diastolic > 90)) {
        alertMessage = `Critical BP: ${vital.bloodPressure.systolic}/${vital.bloodPressure.diastolic} mmHg`;
    }
    if (alertMessage) {
        server_1.io.to(`doctor:${vital.doctorId}`).emit('vital:alert', {
            sender: vital.patientId,
            vitalId: vital._id,
            message: alertMessage,
            vital,
        });
    }
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.ACCEPTED,
        success: true,
        message: 'Vital Submitted successfully!!',
        data: vital,
    });
}));
exports.getVitals = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = req.query;
    const result = yield vitalsService.getVitalsByPatientId(req.params.patientId, query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.ACCEPTED,
        success: true,
        message: "Vitals Retrieved successfully",
        data: result,
    });
}));
exports.getVitalsByDoctor = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = req.query;
    const result = yield vitalsService.getVitalsByDoctorId(req.params.doctorId, query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.ACCEPTED,
        success: true,
        message: "Vitals Retrieved successfully",
        data: result,
    });
}));
exports.getVital = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const vital = yield vitalsService.getVitalById(req.params.id);
    res.status(200).json(vital);
}));
exports.updateVital = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const vital = yield vitalsService.updateVital(req.params.id, req.body);
    res.status(200).json(vital);
}));
exports.deleteVital = (0, asyncHandler_1.asyncHandler)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield vitalsService.deleteVital(req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.ACCEPTED,
        success: true,
        message: "Vital deleted successfully",
    });
}));
const getPatientsByDoctorId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { doctorId } = req.params;
        const patients = yield vitalsService.getPatientsByDoctorId(doctorId);
        res.status(200).json({
            success: true,
            data: patients,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'An error occurred',
        });
    }
});
exports.getPatientsByDoctorId = getPatientsByDoctorId;
