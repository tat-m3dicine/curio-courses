import Validator from 'fastest-validator';
import { ValidationError } from '../../exceptions/ValidationError';
import { IIRPUserMigrationRequest, IRPUserRegistrationRquest } from '../../models/entities/IIRP';

const migrateUserSchema = {
  _id: 'string',
  name: 'string',
  key: 'string',
  role: 'string',
  username: 'string',
  avatar: 'string',
  grade: 'string',
  sectionname: 'string',
  sectionuuid: 'string',
  schooluuid: 'string',
  preferences: 'array'
};

const registerUserSchema = {
  user_id: 'string',
  provider: 'string',
  new_user_data: {
    type: 'object',
    props: {
      name: 'string',
      grade: 'string',
      avatar: 'string',
      curriculum: 'string',
      preferences: 'array',
      role: {
        type: 'array',
        items: 'string'
      },
      school: {
        type: 'object',
        props: {
          name: 'string',
          uuid: 'string'
        }
      },
      section: {
        type: 'array',
        min: 1,
        items: {
          type: 'object',
          props: {
            uuid: 'string',
            name: 'string'
          }
        }
      },
      inviteCode: 'string'
    }
  }
};

const updateUserSchema = {
  user_id: 'string',
  new_user_data: {
    type: 'object',
    props: {
      name: {
        type: 'string',
        optional: true
      },
      avatar: {
        type: 'string',
        optional: true
      },
      role: {
        type: 'array',
        items: 'string',
        optional: true
      }
    }
  }
};

const validator = new Validator();
const validateMigrate = validator.compile(migrateUserSchema);
const validateRegister = validator.compile(registerUserSchema);
const validateUpdate = validator.compile(updateUserSchema);

export const validateMigrateUser = (request: IIRPUserMigrationRequest) => {
  const isValidationPassed = validateMigrate(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};

export const validateRegisterUser = (request: IRPUserRegistrationRquest) => {
  const isValidationPassed = validateRegister(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};

export const validateUpdateUser = (request: any) => {
  const isValidationPassed = validateUpdate(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};