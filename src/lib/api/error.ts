// src/lib/api/error.ts
export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: any;
}

export interface ApiError {
  success: false;
  data: null;
  error: ApiErrorDetail;
  metadata: {
    requestId: string;
    timestamp: string;
  };
}

export function apiError(
  code: string,
  message: string,
  requestId: string,
  details?: any
): ApiError {
  return {
    success: false,
    data: null,
    error: { code, message, details },
    metadata: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
}
