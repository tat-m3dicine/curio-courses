import { AppError } from './AppError';

export class InvalidLicenseError extends AppError {
  constructor(description: string, protected statusCode = 400) {
    super('invalid_license', description);
  }
}