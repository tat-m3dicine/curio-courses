import { validateCreateSchool, validateUpdateSchool, validateUpdateAcademicsSchool } from './SchoolsSchema';
import { validateCreateSection } from './SectionsSchema';
import { validateCreateCourse, validateUpdateCourse } from './CoursesSchema';
import { validateCreateLicense } from './LicenseSchema';
import { validateCreateUser } from './UserSchema';
import {
  validateStudentsList,
  validateStudentsObjects,
  validateStudentsSwitch,
  validateTeachersList,
  validateTeachersObjects,
  validateTeachersSwitch
} from './CoursesRequestsSchema';
const validators = {
  validateCreateSchool,
  validateUpdateSchool,
  validateCreateLicense,
  validateCreateSection,
  validateCreateCourse,
  validateCreateUser,
  validateUpdateCourse,
  validateUpdateAcademicsSchool,
  validateStudentsList,
  validateStudentsObjects,
  validateStudentsSwitch,
  validateTeachersList,
  validateTeachersObjects,
  validateTeachersSwitch
};
export default validators;