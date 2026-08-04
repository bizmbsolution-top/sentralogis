import { JobOrder } from './JobOrder';
import { JobOrderStatus } from './JobOrderStatus';

describe('JobOrder Aggregate', () => {
  it('creates a valid JobOrder', () => {
    const result = JobOrder.create('WO-123', 'jo-1', 'tenant');
    expect(result.isSuccess).toBe(true);
    expect(result.getValue().status).toBe(JobOrderStatus.PENDING_ASSIGNMENT);
  });

  it('fails creation if workOrderId is missing', () => {
    const result = JobOrder.create('', 'jo-1', 'tenant');
    expect(result.isFailure).toBe(true);
  });
});
