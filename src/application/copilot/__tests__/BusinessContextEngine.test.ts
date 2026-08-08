import { BusinessContextEngine } from '../BusinessContextEngine';
import { EntityResolver } from '../EntityResolver';
import { EntityLookupService } from '../EntityLookupService';
import { AmbiguityResolver } from '../AmbiguityResolver';
import { CopilotIntent } from '../CopilotIntent';
import { IRequestContext } from '../../../domains/security/contracts/IRequestContext';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase Client
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis()
} as unknown as SupabaseClient;

describe('BusinessContextEngine', () => {
  let engine: BusinessContextEngine;
  let lookupService: EntityLookupService;
  
  const mockTenantId = 'tenant-123';
  const mockContext: IRequestContext = {
    userId: 'user-1',
    tenantId: mockTenantId,
    role: 'ADMIN',
    trace: { traceId: '1', spanId: '1' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    lookupService = new EntityLookupService(mockSupabase);
    const ambiguityResolver = new AmbiguityResolver();
    const entityResolver = new EntityResolver(lookupService, ambiguityResolver);
    engine = new BusinessContextEngine(entityResolver);
  });

  const createIntent = (type: any, value: string): CopilotIntent => ({
    intentName: 'ASSIGN_DRIVER',
    parameters: { action: 'assign' },
    entities: [{ type, value }]
  });

  it('resolves a Single Driver successfully', async () => {
    (mockSupabase.limit as jest.Mock).mockResolvedValue({
      data: [{ id: 'uuid-1', name: 'Budi Santoso', tenant_id: mockTenantId }],
      error: null
    });

    const intent = createIntent('DRIVER', 'Budi Santoso');
    const result = await engine.buildContext(intent, mockContext);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().resolvedEntities['DRIVER:Budi Santoso'].id).toBe('uuid-1');
  });

  it('fails with AMBIGUOUS when Multiple Drivers match', async () => {
    (mockSupabase.limit as jest.Mock).mockResolvedValue({
      data: [
        { id: 'uuid-1', name: 'Budi Santoso', tenant_id: mockTenantId },
        { id: 'uuid-2', name: 'Budi Hartono', tenant_id: mockTenantId }
      ],
      error: null
    });

    const intent = createIntent('DRIVER', 'Budi');
    const result = await engine.buildContext(intent, mockContext);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Ambiguous Entity');
    expect(result.error).toContain('Budi Santoso, Budi Hartono');
  });

  it('fails with NOT_FOUND for a Missing Driver', async () => {
    (mockSupabase.limit as jest.Mock).mockResolvedValue({ data: [], error: null });

    const intent = createIntent('DRIVER', 'Unknown Driver');
    const result = await engine.buildContext(intent, mockContext);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Entity Not Found');
  });

  it('fails with TENANT_MISMATCH for a Wrong Tenant', async () => {
    (mockSupabase.limit as jest.Mock).mockResolvedValue({
      data: [{ id: 'uuid-1', name: 'Budi', tenant_id: 'other-tenant' }],
      error: null
    });

    const intent = createIntent('DRIVER', 'Budi');
    const result = await engine.buildContext(intent, mockContext);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Permission Denied');
  });

  it('fails with NOT_FOUND for a Missing Job Order', async () => {
    (mockSupabase.limit as jest.Mock).mockResolvedValue({ data: [], error: null });

    const intent = createIntent('JOB_ORDER', 'JO-999');
    const result = await engine.buildContext(intent, mockContext);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Entity Not Found');
  });

  it('fails with NOT_FOUND for a Missing Vehicle', async () => {
    (mockSupabase.limit as jest.Mock).mockResolvedValue({ data: [], error: null });

    const intent = createIntent('VEHICLE', 'B-1234-XYZ');
    const result = await engine.buildContext(intent, mockContext);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Entity Not Found');
  });

  it('fails with NOT_FOUND for a Missing Container', async () => {
    (mockSupabase.limit as jest.Mock).mockResolvedValue({ data: [], error: null });

    const intent = createIntent('CONTAINER', 'CONT123');
    const result = await engine.buildContext(intent, mockContext);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Entity Not Found');
  });

  it('handles Repository Failure gracefully', async () => {
    (mockSupabase.limit as jest.Mock).mockResolvedValue({
      data: null,
      error: new Error('Database connection failed')
    });

    const intent = createIntent('DRIVER', 'Budi');
    const result = await engine.buildContext(intent, mockContext);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Entity Not Found'); // Current implementation treats DB error as empty array -> NOT_FOUND
  });

  it('meets Entity Resolution Performance targets (<300ms)', async () => {
    (mockSupabase.limit as jest.Mock).mockImplementation(() => {
      return new Promise(resolve => setTimeout(() => resolve({
        data: [{ id: 'uuid-1', jo_number: 'JO-123', tenant_id: mockTenantId }],
        error: null
      }), 50)); // Mock 50ms DB delay
    });

    const intent = createIntent('JOB_ORDER', 'JO-123');
    
    const start = Date.now();
    await engine.buildContext(intent, mockContext);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(300);
  });
});
