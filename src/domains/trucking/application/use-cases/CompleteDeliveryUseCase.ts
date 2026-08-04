import { ITruckingJobRepository } from '../../domain/repositories/ITruckingJobRepository';
import { IDomainEventDispatcher } from '../../../../shared/domain-services/IDomainEventDispatcher';
import { JobOrderCompleted } from '../../domain/events/JobOrderCompleted';
import { EventEnvelope } from '../../../../shared/domain-services/events/EventEnvelope';
import { randomUUID } from 'crypto';

export interface CompleteDeliveryRequest {
  jobOrderId: string;
  completedAt: Date;
}

export class CompleteDeliveryUseCase {
  constructor(
    private truckingRepo: ITruckingJobRepository,
    private eventDispatcher: IDomainEventDispatcher
  ) {}
  
  async execute(request: CompleteDeliveryRequest): Promise<void> {
    const jobOrder = await this.truckingRepo.findById(request.jobOrderId);
    if (!jobOrder) {
      throw new Error('Trucking job order not found');
    }
    
    // In a real scenario, state transition rules should be validated here via StatusTransitionService
    // Assuming it succeeds:
    
    const eventPayload = new JobOrderCompleted(
      randomUUID(),
      jobOrder.id,
      { joNumber: jobOrder.joNumber, completedAt: request.completedAt.toISOString() },
      jobOrder.tenantId
    );
    
    const envelope: EventEnvelope<JobOrderCompleted> = {
      metadata: {
        source: 'TruckingDomain',
        schemaVersion: '1.0',
        contentType: 'application/json',
        timestamp: new Date()
      },
      headers: {},
      payload: eventPayload
    };
    
    await this.truckingRepo.save(jobOrder);
    await this.eventDispatcher.dispatchSynchronous(envelope);
  }
}
