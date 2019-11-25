import Validator from 'fastest-validator';
import { ValidationError } from '../../exceptions/ValidationError';
import { ICreateLicenseRequest } from '../../models/requests/ISchoolRequests';

const createLicenseSchema = {
  students: {
    type: 'number'
  },
  teachers: {
    type: 'number'
  },
  validTo: {
    type: 'date',
    convert: true
  },
  reference: {
    type: 'string'
  },
  isEnabled: {
    type: 'boolean'
  },
  package: {
    type: 'object',
    props: {
      grades: {
        type: 'object'
      }
    }
  },
  $$strict: true
};

const validator = new Validator();
const validateCreate = validator.compile(createLicenseSchema);

export const validateCreateLicense = (request: ICreateLicenseRequest) => {
  const isValidationPassed = validateCreate(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};