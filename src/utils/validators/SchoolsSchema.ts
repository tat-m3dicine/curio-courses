import Validator from 'fastest-validator';
import { ValidationError } from '../../exceptions/ValidationError';
import { ICreateSchoolRequest, IUpdateSchoolRequest, IUpdateUserRequest } from '../../models/requests/ISchoolRequests';
import { IAcademicTerm } from '../../models/entities/Common';
import { localesSchema } from './LocalesSchema';

const createSchoolsSchema = {
  locales: localesSchema('en'),
  location: {
    type: 'string'
  },
  $$strict: true
};

const updateSchoolsSchema = {
  locales: localesSchema(),
  location: {
    type: 'string',
    optional: true
  },
  $$strict: true
};

const updateAcademicsSchema = {
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
    }
  },
  $$strict: true
};

const updateUsersSchema = {
  users: {
    type: 'array',
    items: {
      type: 'object',
      props: {
        _id: 'string',
        permissions: {
          type: 'array',
          items: 'string'
        }
      }
    }
  },
  $$strict: true
};

const deleteUsersSchema = {
  users: {
    type: 'array',
    items: 'string'
  },
  $$strict: true
};

const validator = new Validator();
const validateCreate = validator.compile(createSchoolsSchema);
const validateUpdate = validator.compile(updateSchoolsSchema);
const validateUpdateAcademics = validator.compile(updateAcademicsSchema);
const validateUpdateUsers = validator.compile(updateUsersSchema);
const validateDeleteUsers = validator.compile(deleteUsersSchema);

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

export const validateUpdateAcademicsSchool = (request: { academicTerms: IAcademicTerm }) => {
  const isValidationPassed = validateUpdateAcademics(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};

export const validateUpdateSchoolUsers = (request: { users: IUpdateUserRequest[] }) => {
  const isValidationPassed = validateUpdateUsers(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};

export const validateDeleteSchoolUsers = (request: { users: string[] }) => {
  const isValidationPassed = validateDeleteUsers(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};