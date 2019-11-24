import { AppError } from './AppError';

export class NotFoundError extends AppError {
  constructor(description: string) {
    super('resource_not_found', description, 404);
  }
}