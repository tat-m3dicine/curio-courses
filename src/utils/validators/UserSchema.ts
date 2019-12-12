import Validator from 'fastest-validator';
import { ValidationError } from '../../exceptions/ValidationError';
import { IUser } from '../../models/entities/IUser';
import { localesSchema } from './LocalesSchema';

const createUserSchema = {
  _id: {
    type: 'string'
  },
  profile: {
    type: 'object',
    props: {
      name: {
        type: 'string'
      },
      avatar: {
        type: 'string'
      },
      grade: {
        type: 'string'
      }
    }
  },
  role: {
    type: 'array',
    items: 'string'
  },
  registration: {
    type: 'object',
    props: {
      schoolId: {
        type: 'string'
      },
      joinDate: {
        type: 'date'
      },
      finishedDate: {
        type: 'date',
        optional: true
      }
    }
  }
};


const validator = new Validator();
const validateCreate = validator.compile(createUserSchema);

export const validateCreateUser = (request: IUser) => {
  const isValidationPassed = validateCreate(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};
