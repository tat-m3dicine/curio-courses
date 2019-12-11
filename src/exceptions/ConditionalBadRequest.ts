import { AppError } from './AppError';

export class ConditionalBadRequest extends AppError {
  constructor(description: string) {
    super('action_not_allowed', description, 412);
  }
}