import Validator from 'fastest-validator';
import { ValidationError } from '../../exceptions/ValidationError';
import { ICreateCourseRequest } from '../../models/requests/ICourseRequests';
import { ICourse } from '../../models/entities/ICourse';

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

const courseCreateSchema = {
  locales: {
    type: 'object',
    strict: true,
    props: {
      en: localeSchema,
      ar: localeSchema
    }
  },
  schoolId: 'string',
  sectionId: 'string',
  curriculum: 'string',
  grade: 'string',
  subject: 'string',
  defaultLocale: {
    type: 'string',
    optional: true
  },
  isEnabled: {
    type: 'boolean',
    optional: true
  },
  teachers: {
    type: 'array',
    items: 'string',
    optional: true
  },
  students: {
    type: 'array',
    items: 'string',
    optional: true
  },
  academicTermId: {
    type: 'string',
    optional: true
  },
  $$strict: true
};

const courseUpdateSchema = {
  locales: {
    type: 'object',
    strict: true,
    optional: true,
    props: {
      en: localeSchema,
      ar: localeSchema
    }
  },
  defaultLocale: {
    type: 'string',
    optional: true
  },
  $$strict: true
};

const validator = new Validator();
const validateCreate = validator.compile(courseCreateSchema);
const validateUpdate = validator.compile(courseUpdateSchema);

export const validateCreateCourse = (request: ICreateCourseRequest) => {
  const isValidationPassed = validateCreate(request);
  if (typeof isValidationPassed !== 'boolean') {
    throw new ValidationError(isValidationPassed);
  }
  if (Object.keys(request.locales).length === 0) {
    throw new ValidationError([validator.makeError('No locales were sent!')]);
  }
  return isValidationPassed;
};

export const validateUpdateCourse = (request: Partial<ICourse>) => {
  const isValidationPassed = validateUpdate(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};

