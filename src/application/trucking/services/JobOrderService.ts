import { Result } from '../../../shared/kernel/Result';
import { IPermissionEngine } from '../../../domains/security/contracts/IPermissionEngine';
import { IRequestContext } from '../../../domains/security/contracts/IRequestContext';
import { IJobOrderRepository } from '../../../domains/trucking/repositories/IJobOrderRepository';
import { IDriverRepository } from '../../../domains/trucking/repositories/IDriverRepository';
import { IVehicleRepository } from '../../../domains/trucking/repositories/IVehicleRepository';
import { JobOrder } from '../../../domains/trucking/job-order/JobOrder';
import { AssignDriverCommand } from '../commands/AssignDriverCommand';
import { AcceptJobCommand } from '../commands/AcceptJobCommand';
import { StartMissionCommand } from '../commands/StartMissionCommand';
import { CompleteMissionCommand } from '../commands/CompleteMissionCommand';
import { CancelMissionCommand } from '../commands/CancelMissionCommand';

const RESOURCE = 'trucking.job-order';

export class JobOrderService {
  constructor(
    private readonly permissionEngine: IPermissionEngine,
    private readonly jobOrderRepo: IJobOrderRepository,
    private readonly driverRepo: IDriverRepository,
    private readonly vehicleRepo: IVehicleRepository
  ) {}

  async assignDriver(ctx: IRequestContext, cmd: AssignDriverCommand): Promise<Result<void>> {
    if (!this.permissionEngine.can(ctx, 'assign', RESOURCE)) {
      return Result.fail<void>('Unauthorized: cannot assign driver to job order.');
    }

    const jobOrder = await this.jobOrderRepo.findById(cmd.jobOrderId, ctx.tenantId);
    if (!jobOrder) {
      return Result.fail<void>(`JobOrder ${cmd.jobOrderId} not found.`);
    }

    const driver = await this.driverRepo.findById(cmd.driverId, ctx.tenantId);
    if (!driver) {
      return Result.fail<void>(`Driver ${cmd.driverId} not found.`);
    }

    const vehicle = await this.vehicleRepo.findById(cmd.vehicleId, ctx.tenantId);
    if (!vehicle) {
      return Result.fail<void>(`Vehicle ${cmd.vehicleId} not found.`);
    }

    const assignResult = jobOrder.assignDriverAndVehicle(cmd.driverId, cmd.vehicleId);
    if (assignResult.isFailure) {
      return assignResult;
    }

    const markResult = driver.markOnDuty();
    if (markResult.isFailure) {
      return Result.fail<void>(`Driver cannot be marked on duty: ${markResult.error}`);
    }

    const dispatchResult = vehicle.dispatch();
    if (dispatchResult.isFailure) {
      return Result.fail<void>(`Vehicle cannot be dispatched: ${dispatchResult.error}`);
    }

    const saveJoResult = await this.jobOrderRepo.save(jobOrder);
    if (saveJoResult.isFailure) return saveJoResult;

    const saveDriverResult = await this.driverRepo.save(driver);
    if (saveDriverResult.isFailure) return saveDriverResult;

    const saveVehicleResult = await this.vehicleRepo.save(vehicle);
    if (saveVehicleResult.isFailure) return saveVehicleResult;

    return Result.ok<void>();
  }

  async acceptJob(ctx: IRequestContext, cmd: AcceptJobCommand): Promise<Result<void>> {
    if (!this.permissionEngine.can(ctx, 'accept', RESOURCE)) {
      return Result.fail<void>('Unauthorized: cannot accept job order.');
    }

    const jobOrder = await this.jobOrderRepo.findById(cmd.jobOrderId, ctx.tenantId);
    if (!jobOrder) {
      return Result.fail<void>(`JobOrder ${cmd.jobOrderId} not found.`);
    }

    const domainResult = jobOrder.acceptByDriver();
    if (domainResult.isFailure) {
      return domainResult;
    }

    const saveResult = await this.jobOrderRepo.save(jobOrder);
    if (saveResult.isFailure) return saveResult;
    return Result.ok<void>();
  }

  async startMission(ctx: IRequestContext, cmd: StartMissionCommand): Promise<Result<void>> {
    if (!this.permissionEngine.can(ctx, 'start', RESOURCE)) {
      return Result.fail<void>('Unauthorized: cannot start mission.');
    }

    const jobOrder = await this.jobOrderRepo.findById(cmd.jobOrderId, ctx.tenantId);
    if (!jobOrder) {
      return Result.fail<void>(`JobOrder ${cmd.jobOrderId} not found.`);
    }

    const domainResult = jobOrder.startMission();
    if (domainResult.isFailure) {
      return domainResult;
    }

    const saveResult = await this.jobOrderRepo.save(jobOrder);
    if (saveResult.isFailure) return saveResult;
    return Result.ok<void>();
  }

  async completeMission(ctx: IRequestContext, cmd: CompleteMissionCommand): Promise<Result<void>> {
    if (!this.permissionEngine.can(ctx, 'complete', RESOURCE)) {
      return Result.fail<void>('Unauthorized: cannot complete mission.');
    }

    const jobOrder = await this.jobOrderRepo.findById(cmd.jobOrderId, ctx.tenantId);
    if (!jobOrder) {
      return Result.fail<void>(`JobOrder ${cmd.jobOrderId} not found.`);
    }

    const domainResult = jobOrder.completeMission();
    if (domainResult.isFailure) {
      return domainResult;
    }

    const saveResult = await this.jobOrderRepo.save(jobOrder);
    if (saveResult.isFailure) return saveResult;
    return Result.ok<void>();
  }

  async cancelMission(ctx: IRequestContext, cmd: CancelMissionCommand): Promise<Result<void>> {
    if (!this.permissionEngine.can(ctx, 'cancel', RESOURCE)) {
      return Result.fail<void>('Unauthorized: cannot cancel mission.');
    }

    const jobOrder = await this.jobOrderRepo.findById(cmd.jobOrderId, ctx.tenantId);
    if (!jobOrder) {
      return Result.fail<void>(`JobOrder ${cmd.jobOrderId} not found.`);
    }

    const domainResult = jobOrder.cancelMission();
    if (domainResult.isFailure) {
      return domainResult;
    }

    const saveResult = await this.jobOrderRepo.save(jobOrder);
    if (saveResult.isFailure) return saveResult;
    return Result.ok<void>();
  }
}
