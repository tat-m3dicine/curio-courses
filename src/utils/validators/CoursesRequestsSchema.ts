import Validator from 'fastest-validator';
import { ValidationError } from '../../exceptions/ValidationError';

const validator = new Validator();

const listSchema = {
  type: 'array',
  items: 'string',
  min: 1,
  $$strict: true
};

const objectsSchema = (lists: string[]) => ({
  type: 'array',
  $$strict: true,
  min: 1,
  items: {
    type: 'object',
    props: {
      id: 'string',
      ...lists.reduce((map, list) => (
        { ...map, [list]: listSchema }
      ), {})
    }
  }
});

const studentsListValidateor = validator.compile({ students: listSchema, $$strict: true });
const studentsObjectsValidateor = validator.compile({ students: objectsSchema(['courses']), $$strict: true });
const studentsSwitchValidateor = validator.compile({ students: objectsSchema(['enroll', 'drop']), $$strict: true });

const teachersListValidateor = validator.compile({ teachers: listSchema, $$strict: true });
const teachersObjectsValidateor = validator.compile({ teachers: objectsSchema(['courses']), $$strict: true });
const teachersSwitchValidateor = validator.compile({ teachers: objectsSchema(['enroll', 'drop']), $$strict: true });

const validateRequest = (request: any, validate: (request: any) => any) => {
  const isValidationPassed = validate(request);
  if (typeof isValidationPassed === 'boolean') {
    return isValidationPassed;
  } else {
    throw new ValidationError(isValidationPassed);
  }
};

export const validateStudentsList = request => validateRequest(request, studentsListValidateor);
export const validateStudentsObjects = request => validateRequest(request, studentsObjectsValidateor);
export const validateStudentsSwitch = request => validateRequest(request, studentsSwitchValidateor);
export const validateTeachersList = request => validateRequest(request, teachersListValidateor);
export const validateTeachersObjects = request => validateRequest(request, teachersObjectsValidateor);
export const validateTeachersSwitch = request => validateRequest(request, teachersSwitchValidateor);
