import { describe, it, expect } from 'vitest';
import {
  Gate3TestHarnessV12,
  DISPOSABLE_ENV_EXPECTATIONS_V12,
  type FullSuiteResult,
} from '../../_governance/phase-3d5-g3-e2/PROPOSED_gate3_harness_v14';

describe('Gate 3 Ephemeral Runtime Verification', () => {
  it(
    'executes Gate 3 full suite against disposable container',
    async () => {
      const harness = new Gate3TestHarnessV12({
        host: '127.0.0.1',
        port: DISPOSABLE_ENV_EXPECTATIONS_V12.EXPECTED_HOST_PORT,
        database: DISPOSABLE_ENV_EXPECTATIONS_V12.EXPECTED_DB_NAME,
        user: DISPOSABLE_ENV_EXPECTATIONS_V12.EXPECTED_ROLE,
        password: 'postgres',
        expectedMarker: DISPOSABLE_ENV_EXPECTATIONS_V12.EXPECTED_MARKER,
      });

      let result: FullSuiteResult;
      try {
        result = await harness.runFullSuite();
      } catch (err: unknown) {
        try {
          console.log(
            'GATE3_PRE_RESULT_EXCEPTION:',
            JSON.stringify(
              {
                errorName: err instanceof Error ? err.name : 'NonErrorThrown',
                errorMessage: err instanceof Error ? err.message : String(err),
                stack: err instanceof Error ? (err.stack ?? null) : null,
              },
              null,
              2
            )
          );
        } catch (logErr: unknown) {
          try {
            console.error(
              'GATE3_DIAGNOSTIC_LOGGING_FAILURE:',
              logErr instanceof Error ? logErr.message : 'Pre-result diagnostic logging failed'
            );
          } catch {
            // Preserve original exception when both stdout and stderr fail
          }
        }
        throw err;
      }

      try {
        const t1 = result.test1_NaturalConcurrency;
        console.log(
          'GATE3_SUITE_RESULT_DIAGNOSTICS:',
          JSON.stringify(
            {
              suiteRunId: result.suiteRunId,
              overallSuiteVerdict: result.overallSuiteVerdict,
              suiteAbortedEarly: result.suiteAbortedEarly,
              abortReason: result.abortReason ?? null,
              objectiveA_ControlledContentionStatus: result.objectiveA_ControlledContentionStatus,
              objectiveB_NaturalConcurrencyStatus: result.objectiveB_NaturalConcurrencyStatus,
              objectiveB_Diagnostics: t1
                ? {
                    overallVerdict: t1.overallVerdict,
                    concurrencyContentionVerdict: t1.concurrencyContentionVerdict,
                    dataIntegrityVerdict: t1.dataIntegrityVerdict,
                    worker2BlockedObserved: t1.worker2BlockedObserved,
                    contentionDirection: t1.contentionDirection ?? null,
                    observationSamples: t1.observationSamples ?? null,
                    observationStopReason: t1.observationStopReason ?? null,
                    observationElapsedMs: t1.observationElapsedMs ?? null,
                    monitorErrors: t1.monitorErrors ?? [],
                    telemetryNotes: t1.telemetryNotes,
                    timedOut: t1.timedOut,
                    operationUnsettled: t1.operationUnsettled ?? false,
                    cleanupErrorsCount: t1.cleanupErrors.length,
                  }
                : 'SCENARIO_1_NOT_EXECUTED',
              cleanupErrorsSummary: {
                test0: result.test0_ControlledContention?.cleanupErrors.length ?? 0,
                test1: t1?.cleanupErrors.length ?? 0,
              },
            },
            null,
            2
          )
        );
      } catch (logErr: unknown) {
        try {
          console.error(
            'GATE3_DIAGNOSTIC_LOGGING_FAILURE:',
            logErr instanceof Error ? logErr.message : 'Suite-result diagnostic logging failed'
          );
        } catch {
          // Preserve assertion evaluation when both stdout and stderr fail
        }
      }

      expect(result.suiteAbortedEarly).toBe(false);
      expect(result.overallSuiteVerdict).toBe('PASS');
      expect(result.objectiveA_ControlledContentionStatus).toBe('PASS');
      expect(result.objectiveB_NaturalConcurrencyStatus).toBe('PROVEN');
    },
    60000
  );
});
