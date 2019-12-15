import Validator from 'fastest-validator';
import { ValidationError } from '../../exceptions/ValidationError';
import { ICreateInviteCodeRequest } from '../../models/requests/IInviteCodeRequests';
import { EnrollmentType } from '../../models/entities/IInviteCode';

const sectionsSchema = {
  schoolId: 'string',
  quota: 'number',
  validity: {
    type: 'object',
    strict: true,
    props: {
      fromDate: 'date',
      toDate: 'date'
    }
  },
  enrollment: {
    type: 'object',
    strict: true,
    props: {
      sectionId: 'string',
      type: {
        type: 'enum',
        values: Object.keys(EnrollmentType)
      },
      courses: {
        type: 'array',
        items: 'string',
        optional: true,
        min: 1
      }
    }
  },
  $$strict: true
};

const validator = new Validator();
const validateCreate = validator.compile(sectionsSchema);

export const validateCreateInviteCode = (request: ICreateInviteCodeRequest) => {
  const isValidationPassed = validateCreate(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};