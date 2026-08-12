export interface DriverReadiness {
  ready: boolean;
  reason: string;
}

export function computeDriverReadiness(params: {
  driverStatus?: string | null;
}): DriverReadiness {
  const { driverStatus } = params;

  if (driverStatus === 'unavailable') {
    return {
      ready: false,
      reason: 'Sakit/Cuti',
    };
  }

  return {
    ready: true,
    reason: 'Ready',
  };
}