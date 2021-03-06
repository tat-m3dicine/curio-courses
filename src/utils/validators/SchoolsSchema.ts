import Validator from 'fastest-validator';
import { ValidationError } from '../../exceptions/ValidationError';
import { ICreateSchoolRequest, IUpdateSchoolRequest, IUpdateUserRequest, IPatchSchoolTermRequest } from '../../models/requests/ISchoolRequests';
import { IAcademicTerm } from '../../models/entities/Common';
import { localesSchema } from './LocalesSchema';

const createSchoolsSchema = {
  _id: {
    type: 'string',
    optional: true
  },
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

const updateAcademicTermSchema = {
  academicTerm: {
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

const patchAcademicTermSchema = {
  _id: 'string',
  endDate: 'date',
  gracePeriod: {
    type: 'number',
    optional: true
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

const registerUserSchema = {
  users: {
    type: 'array',
    min: 1,
    items: {
      type: 'string'
    }
  }
};

const validator = new Validator();
const validateCreate = validator.compile(createSchoolsSchema);
const validateUpdate = validator.compile(updateSchoolsSchema);
const validatePatchAcademicTerm = validator.compile(patchAcademicTermSchema);
const validateUpdateAcademicTerm = validator.compile(updateAcademicTermSchema);
const validateUpdateUsers = validator.compile(updateUsersSchema);
const validateDeleteUsers = validator.compile(deleteUsersSchema);
const _validateUserRegisteration = validator.compile(registerUserSchema);

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

export const validatePatchSchoolAcademicTerm = (request: IPatchSchoolTermRequest) => {
  const isValidationPassed = validatePatchAcademicTerm(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};

export const validateUpdateSchoolAcademicTerm = (request: { academicTerm: IAcademicTerm }) => {
  const isValidationPassed = validateUpdateAcademicTerm(request);
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

export const validateUserRegisteration = (request: { users: string[] }) => {
  const isValidationPassed = _validateUserRegisteration(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};