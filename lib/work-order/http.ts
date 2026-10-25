import { NextResponse } from 'next/server';

export function toWorkOrderErrorResponse(error: unknown): NextResponse {
  if (error && typeof error === 'object' && 'statusCode' in error && 'code' in error) {
    const e = error as { code: string; statusCode: number; message: string };
    return NextResponse.json(
      { success: false, error: e.code, message: e.message },
      { status: e.statusCode },
    );
  }
  if (error && error instanceof Error) {
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json(
    { success: false, error: 'UNKNOWN_ERROR', message: 'An unknown error occurred.' },
    { status: 500 },
  );
}
