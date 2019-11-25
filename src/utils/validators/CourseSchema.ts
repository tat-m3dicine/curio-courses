import Validator from 'fastest-validator';
import { ValidationError } from '../../exceptions/ValidationError';
import { ICreateCourseRequest } from '../../models/requests/ICreateCourseRequest';

const localeSchema = {
  type: 'object',
  optional: true,
  props: {
    name: {
      type: 'string'
    }
  }
};

const courseSchema = {
  locales: {
    type: 'object',
    strict: true,
    props: {
      en: localeSchema,
      ar: localeSchema
    }
  },
  subjectId: {
    type: 'string'
  },
  schoolId: {
    type: 'string'
  },
  sectionId: {
    type: 'string'
  },
  curriculum: {
    type: 'string'
  },
  grade: {
    type: 'string'
  },
  defaultLocale: {
    type: 'string'
  },
  isEnabled: {
    type: 'boole'
  },
  $$strict: true
};

const validator = new Validator();
const validateCreate = validator.compile(courseSchema);

export const validateCourse = (request: ICreateCourseRequest) => {
  const isValidationPassed = validateCreate(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};