import Validator from 'fastest-validator';
import { ValidationError } from '../../exceptions/ValidationError';
import { ICreateSectionRequest } from '../../models/requests/ICreateSectionRequest';

const localeSchema = {
  type: 'object',
  optional: true,
  props: {
    name: 'string',
    description: {
      type: 'string',
      optional: true
    }
  }
};

const sectionsSchema = {
  locales: {
    type: 'object',
    strict: true,
    props: {
      en: { ...localeSchema, optional: false },
      ar: localeSchema
    }
  },
  schoolId: 'string',
  grade: 'string',
  curriculum: 'string',
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