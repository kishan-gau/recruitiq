/**
 * Standard API error structure
 */
export interface ApiError {
  message: string;
  statusCode?: number;
  errorCode?: string;
  details?: any;
}
