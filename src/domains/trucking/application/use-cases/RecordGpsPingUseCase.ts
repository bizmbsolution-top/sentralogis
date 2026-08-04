import { ITruckingJobRepository } from '../../domain/repositories/ITruckingJobRepository';

export interface RecordGpsPingRequest {
  jobOrderId: string;
  lat: number;
  lng: number;
  timestamp: Date;
}

export class RecordGpsPingUseCase {
  constructor(private truckingRepo: ITruckingJobRepository) {}
  
  async execute(request: RecordGpsPingRequest): Promise<void> {
    const telemetry = await this.truckingRepo.findTelemetryByJobId(request.jobOrderId);
    if (!telemetry) {
      throw new Error('Telemetry record not found for job order');
    }
    
    telemetry.recordPing(request.lat, request.lng, request.timestamp);
    await this.truckingRepo.saveTelemetry(telemetry);
  }
}
