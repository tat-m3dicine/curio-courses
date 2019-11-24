import { AppError } from './AppError';

export class ForbiddenError extends AppError {
  constructor(description = 'you are not authorized to do this action') {
    super('forbidden', description, 403);
  }
}