import {
  validateCreateSchool,
  validateUpdateSchool,
  validateUpdateSchoolAcademicTerm,
  validateUpdateSchoolUsers,
  validateDeleteSchoolUsers
} from './SchoolsSchema';
import { validateCreateSection } from './SectionsSchema';
import { validateCreateCourse, validateUpdateCourse } from './CoursesSchema';
import { validateCreateLicense } from './LicenseSchema';
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
  validateUpdateCourse,
  validateUpdateSchoolAcademicTerm,
  validateUpdateSchoolUsers,
  validateDeleteSchoolUsers,
  validateStudentsList,
  validateStudentsObjects,
  validateStudentsSwitch,
  validateTeachersList,
  validateTeachersObjects,
  validateTeachersSwitch
};
export default validators;