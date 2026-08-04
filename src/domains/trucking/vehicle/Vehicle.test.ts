import { Vehicle, VehicleStatus } from './Vehicle';

describe('Vehicle Aggregate', () => {
  it('creates a valid vehicle', () => {
    const result = Vehicle.create({ licensePlate: 'B 1234 CD', status: VehicleStatus.AVAILABLE, capacityKg: 1000 }, 'id', 'tenant');
    expect(result.isSuccess).toBe(true);
  });

  it('fails if capacity is invalid', () => {
    const result = Vehicle.create({ licensePlate: 'B 1234 CD', status: VehicleStatus.AVAILABLE, capacityKg: 0 }, 'id', 'tenant');
    expect(result.isFailure).toBe(true);
  });

  it('allows available vehicle to dispatch and updates status', () => {
    const vehicle = Vehicle.create({ licensePlate: 'B 123', status: VehicleStatus.AVAILABLE, capacityKg: 100 }, 'id', 'tenant').getValue();
    const result = vehicle.dispatch();
    expect(result.isSuccess).toBe(true);
    expect(vehicle.status).toBe(VehicleStatus.IN_USE);
  });

  it('prevents unavailable vehicle from dispatch', () => {
    const vehicle = Vehicle.create({ licensePlate: 'B 123', status: VehicleStatus.IN_USE, capacityKg: 100 }, 'id', 'tenant').getValue();
    const result = vehicle.dispatch();
    expect(result.isFailure).toBe(true);
    expect(vehicle.status).toBe(VehicleStatus.IN_USE);
  });

  it('release returns status to AVAILABLE', () => {
    const vehicle = Vehicle.create({ licensePlate: 'B 123', status: VehicleStatus.IN_USE, capacityKg: 100 }, 'id', 'tenant').getValue();
    const result = vehicle.release();
    expect(result.isSuccess).toBe(true);
    expect(vehicle.status).toBe(VehicleStatus.AVAILABLE);
  });
});
