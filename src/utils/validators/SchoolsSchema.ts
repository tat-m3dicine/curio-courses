import Validator from 'fastest-validator';
import { ValidationError } from '../../exceptions/ValidationError';
import { ICreateSchoolRequest, IUpdateSchoolRequest } from '../../models/requests/ISchoolRequests';
import { IAcademicTerm } from '../../models/entities/Common';

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

const updateSchoolsWithAcademicsSchema = {
  academicTerms: {
    type: 'object',
    optional: true,
    props: {
    year: {
      type: 'string',
      optional: true
    },
    term: {
      type: 'string',
      optional: true
    },
    startDate: {
      type: 'date'
    },
    endDate: {
      type: 'date'
    },
    gracePeriod: {
      type: 'number',
      optional: true
    },
    isEnabled: 'boolean'
  }},
  $$strict: true
};

const validator = new Validator();
const validateCreate = validator.compile(createSchoolsSchema);
const validateUpdate = validator.compile(updateSchoolsSchema);
const validateUpdateAcademics = validator.compile(updateSchoolsWithAcademicsSchema);

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

export const validateUpdateAcademicsSchool = (request: {academicTerms: IAcademicTerm}
  ) => {
  const isValidationPassed = validateUpdateAcademics(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};