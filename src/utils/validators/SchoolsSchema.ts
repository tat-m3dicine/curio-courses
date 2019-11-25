import Validator from 'fastest-validator';
import { ValidationError } from '../../exceptions/ValidationError';
import { ICreateSchoolRequest, IUpdateSchoolRequest } from '../../models/requests/ISchoolRequests';

const localeSchema = {
  type: 'object',
  optional: true,
  props: {
    name: {
      type: 'string'
    }
  }
};

const createSchoolsSchema = {
  locales: {
    type: 'object',
    strict: true,
    props: {
      en: { ...localeSchema, optional: false },
      ar: localeSchema
    }
  },
  location: {
    type: 'string'
  },
  $$strict: true
};

const updateSchoolsSchema = {
  locales: {
    type: 'object',
    strict: true,
    props: {
      en: localeSchema,
      ar: localeSchema
    }
  },
  location: {
    type: 'string',
    optional: true
  },
  $$strict: true
};

const validator = new Validator();
const validateCreate = validator.compile(createSchoolsSchema);
const validateUpdate = validator.compile(updateSchoolsSchema);

export const validateCreateSchool = (request: ICreateSchoolRequest) => {
  const isValidationPassed = validateCreate(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};

export const validateUpdateSchool = (request: IUpdateSchoolRequest) => {
  const isValidationPassed = validateUpdate(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};