/**
 * DTOs pour les réponses API standardisées
 */

export class ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;

  constructor(data: T) {
    this.success = true;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }
}

export class ApiErrorResponse {
  success: false;
  error: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  details?: any;

  constructor(
    error: string,
    statusCode: number,
    path?: string,
    details?: any,
  ) {
    this.success = false;
    this.error = error;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    this.path = path;
    this.details = details;
  }
}
