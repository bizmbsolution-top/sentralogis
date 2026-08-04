import { Driver, DriverStatus } from './Driver';

describe('Driver Aggregate', () => {
  it('creates a valid driver', () => {
    const result = Driver.create({ name: 'John Doe', status: DriverStatus.AVAILABLE, phoneNumber: '123' }, 'id', 'tenant');
    expect(result.isSuccess).toBe(true);
  });

  it('fails if name is missing', () => {
    const result = Driver.create({ name: '', status: DriverStatus.AVAILABLE, phoneNumber: '123' }, 'id', 'tenant');
    expect(result.isFailure).toBe(true);
  });

  it('allows available driver to markOnDuty and updates status', () => {
    const driver = Driver.create({ name: 'John', status: DriverStatus.AVAILABLE, phoneNumber: '123' }, 'id', 'tenant').getValue();
    const result = driver.markOnDuty();
    expect(result.isSuccess).toBe(true);
    expect(driver.status).toBe(DriverStatus.ON_DUTY);
  });

  it('prevents unavailable driver from markOnDuty', () => {
    const driver = Driver.create({ name: 'John', status: DriverStatus.UNAVAILABLE, phoneNumber: '123' }, 'id', 'tenant').getValue();
    const result = driver.markOnDuty();
    expect(result.isFailure).toBe(true);
    expect(driver.status).toBe(DriverStatus.UNAVAILABLE);
  });

  it('release returns status to AVAILABLE', () => {
    const driver = Driver.create({ name: 'John', status: DriverStatus.ON_DUTY, phoneNumber: '123' }, 'id', 'tenant').getValue();
    const result = driver.release();
    expect(result.isSuccess).toBe(true);
    expect(driver.status).toBe(DriverStatus.AVAILABLE);
  });
});
