// src/lib/api/response.ts
export interface ApiMetadata {
  requestId: string;
  timestamp: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  error: null;
  metadata: ApiMetadata;
}

export function apiResponse<T>(data: T, requestId: string): ApiSuccess<T> {
  return {
    success: true,
    data,
    error: null,
    metadata: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
}
