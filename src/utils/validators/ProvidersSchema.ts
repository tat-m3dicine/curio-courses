import Validator from 'fastest-validator';
import { ValidationError } from '../../exceptions/ValidationError';
import { ICreateProviderRequest } from '../../models/requests/IProviderRequest';
import { IAcademicTerm } from '../../models/entities/Common';

const createProviderSchema = {
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
                type: 'date',
                convert: true
            },
            endDate: {
                type: 'date',
                convert: true
            },
            gracePeriod: {
                type: 'number',
                optional: true
            },
            isEnabled: 'boolean'
        }
    },
    config: {
        type: 'object',
        props: {
            autoCreateSchool: {
                type: 'boolean',
                default: false
            },
            autoCreateSection: {
                type: 'boolean',
                default: false
            },
            autoCreateCourse: {
                type: 'boolean',
                default: false
            }
        }
    }
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
          type: 'date',
          convert: true
        },
        endDate: {
          type: 'date',
          convert: true
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

const validator = new Validator();
const validateCreateProviderSchema = validator.compile(createProviderSchema);
const validateUpdateAcademicTerm = validator.compile(updateAcademicTermSchema);

export const validateCreateProvider = (request: ICreateProviderRequest) => {
    const isValidationPassed = validateCreateProviderSchema(request);
    if (typeof isValidationPassed === 'boolean') {
        return isValidationPassed;
    } else {
        throw new ValidationError(isValidationPassed);
    }
};

export const validateUpdateProviderAcademicTerm = (request: { academicTerm: IAcademicTerm }) => {
    const isValidationPassed = validateUpdateAcademicTerm(request);
    if (typeof isValidationPassed === 'boolean') {
      return isValidationPassed;
    } else {
      throw new ValidationError(isValidationPassed);
    }
  };