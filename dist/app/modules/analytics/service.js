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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const model_1 = require("../vitals/model");
const error_1 = require("../../utils/error");
class AnalyticsService {
    getVitalTrends(patientId, period) {
        return __awaiter(this, void 0, void 0, function* () {
            const vitals = yield model_1.VitalModel.find({ patientId }).sort({ timestamp: 1 });
            if (!vitals.length)
                throw new error_1.AppError('No vitals found', 404);
            const data = {
                patientId,
                period: period,
                data: {
                    heartRate: vitals.map(v => v.heartRate).filter(Boolean),
                    bloodPressure: vitals
                        .map(v => v.bloodPressure)
                        .filter(Boolean),
                    glucoseLevel: vitals.map(v => v.glucoseLevel).filter(Boolean),
                    oxygenSaturation: vitals.map(v => v.oxygenSaturation).filter(Boolean),
                    temperature: vitals.map(v => v.temperature).filter(Boolean),
                    respiratoryRate: vitals.map(v => v.respiratoryRate).filter(Boolean),
                    painLevel: vitals.map(v => v.painLevel).filter(Boolean),
                    injury: vitals
                        .map(v => v.injury)
                        .filter(i => i && i.type !== 'none'),
                    visuals: vitals.flatMap(v => v.visuals || []),
                    timestamps: vitals.map(v => v.timestamp),
                },
            };
            return data;
        });
    }
    generateReport(patientId, period) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(patientId);
            return this.getVitalTrends(patientId, period);
        });
    }
}
exports.AnalyticsService = AnalyticsService;
