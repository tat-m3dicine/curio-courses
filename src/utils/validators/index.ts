import {
  validateCreateSchool,
  validateUpdateSchool,
  validateUpdateSchoolAcademicTerm,
  validatePatchSchoolAcademicTerm,
  validateUpdateSchoolUsers,
  validateDeleteSchoolUsers,
  validateUserRegisteration
} from './SchoolsSchema';
import { validateCreateSection } from './SectionsSchema';
import { validateCreateCourse, validateUpdateCourse } from './CoursesSchema';
import { validateCreateLicense } from './LicenseSchema';
import { validateMigrateUser, validateRegisterUser, validateUpdateUser } from './UserSchema';
import { validateCreateInviteCode } from './InviteCodeSchema';
import { validateCreateProvider, validateUpdateProviderAcademicTerm } from './ProvidersSchema';
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
  validateRegisterUser,
  validateMigrateUser,
  validateUpdateUser,
  validateUpdateCourse,
  validateUpdateSchoolAcademicTerm,
  validatePatchSchoolAcademicTerm,
  validateUpdateSchoolUsers,
  validateDeleteSchoolUsers,
  validateStudentsList,
  validateStudentsObjects,
  validateStudentsSwitch,
  validateTeachersList,
  validateTeachersObjects,
  validateTeachersSwitch,
  validateCreateInviteCode,
  validateUserRegisteration,
  validateCreateProvider,
  validateUpdateProviderAcademicTerm
};
export default validators;