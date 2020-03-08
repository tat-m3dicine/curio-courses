import Validator from 'fastest-validator';
import { ValidationError } from '../../exceptions/ValidationError';
import { ICreateSectionRequest } from '../../models/requests/ISectionRequests';
import { localesSchema } from './LocalesSchema';

const sectionsSchema = {
  _id: {
    type: 'string',
    optional: true
  },
  locales: localesSchema('en'),
  schoolId: 'string',
  grade: 'string',
  students: {
    type: 'array',
    items: 'string',
    optional: true
  },
  courses: {
    type: 'array',
    items: {
      type: 'object',
      props: {
        subject: 'string',
        curriculum: 'string',
        enroll: {
          type: 'boolean',
          optional: true
        }
      }
    },
    min: 1,
    optional: true
  },
  $$strict: true
};

const validator = new Validator();
const validateCreate = validator.compile(sectionsSchema);

export const validateCreateSection = (request: ICreateSectionRequest) => {
  const isValidationPassed = validateCreate(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};