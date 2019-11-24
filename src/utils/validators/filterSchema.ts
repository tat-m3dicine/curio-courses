import Validator from 'fastest-validator';
import { ValidationError } from '../../exceptions/ValidationError';
import { IFilter } from '../../models/entities/IFilter';

const filterSchema = {
  users: {
    type: 'array',
    items: {
      type: 'string'
    }
  },
  skills: {
    type: 'array',
    items: {
      type: 'string'
    }
  },
  threshold: {
    type: 'number',
    min: -1,
    max: 1
  },
  operator: {
    type: 'enum',
    values: ['gt', 'gte', 'lt', 'lte']
  }
};

const validator = new Validator();
const validateCreate = validator.compile(filterSchema);

export const validateFilter = (request: IFilter) => {
  const isValidationPassed = validateCreate(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};