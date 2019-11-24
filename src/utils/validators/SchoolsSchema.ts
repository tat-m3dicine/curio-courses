import Validator from 'fastest-validator';
import { ValidationError } from '../../exceptions/ValidationError';
import { ICreateSchoolRequest } from '../../models/requests/ICreateSchoolRequest';

const lcoaleSchema = {
  type: 'object',
  optional: true,
  props: {
    name: {
      type: 'string'
    }
  }
};

const schoolsSchema = {
  locales: {
    type: 'object',
    strict: true,
    props: {
      en: { ...lcoaleSchema, optional: false },
      ar: lcoaleSchema
    }
  },
  location: {
    type: 'string'
  },
  $$strict: true
};

const validator = new Validator();
const validateCreate = validator.compile(schoolsSchema);

export const validateSchool = (request: ICreateSchoolRequest) => {
  const isValidationPassed = validateCreate(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};