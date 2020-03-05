import Validator from 'fastest-validator';
import { ValidationError } from '../../exceptions/ValidationError';
import { ICreateLicenseRequest } from '../../models/requests/ISchoolRequests';
import { SignupMethods } from '../../models/entities/ISchool';
const validator = new Validator();

const createLicenseSchema = {
  students: {
    type: 'number'
  },
  teachers: {
    type: 'number'
  },
  validTo: {
    type: 'custom',
    convert: true,
    check(value: any, schema: any) {
      if (schema.convert === true && !(value instanceof Date)) {
        value = new Date(value);
      }

      if (!(value instanceof Date)) {
        return validator.makeError('date');
      }

      if (isNaN(value.getTime())) {
        return validator.makeError('date');
      }
      if (new Date(value) <= new Date()) return validator.makeError(`validTo should greated than current Date!`);
      return true;
    }
  },
  reference: {
    type: 'string',
    optional: true
  },
  isEnabled: {
    type: 'boolean'
  },
  package: {
    type: 'object',
    props: {
      features: {
        type: 'array',
        items: 'string',
        optional: true
      },
      signupMethods: {
        type: 'array',
        items: {
          type: 'enum',
          values: Object.values(SignupMethods)
        }
      },
      grades: {
        type: 'custom',
        check(value: any) {
          const _grades = Object.keys(value);
          if (_grades.length === 0) return validator.makeError('Grades are required!');
          if (!_grades.every(_grade => Object.keys(value[_grade]).length > 0)) return validator.makeError('Subjects are required!');
          if (_grades.map(_grade => Object.keys(value[_grade]).map(subject => value[_grade][subject]))[0][0].length === 0) return validator.makeError('curriculums are required!');
          return true;
        }
      }
    }
  },
  $$strict: true
};

const validateCreate = validator.compile(createLicenseSchema);

export const validateCreateLicense = (request: ICreateLicenseRequest) => {
  const isValidationPassed = validateCreate(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};