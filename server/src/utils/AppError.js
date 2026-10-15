/**
 * An error whose status, code and message are safe to send to clients.
 * Anything that is not an AppError is reported as a generic 500 (see middleware/errorHandler.js).
 */
export class AppError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} code Machine-readable code from ERROR_CODES
   * @param {string} message Human-readable, client-safe message
   * @param {unknown} [details] Optional client-safe details (e.g. validation issues)
   */
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
