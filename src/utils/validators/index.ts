import { validateCreateSchool, validateUpdateSchool } from './SchoolsSchema';
import { validateCreateSection } from './SectionsSchema';
import { validateCreateCourse, validateUpdateCourse } from './CoursesSchema';
import { validateCreateLicense } from './LicenseSchema';
const validators = {
  validateCreateSchool,
  validateUpdateSchool,
  validateCreateLicense,
  validateCreateSection,
  validateCreateCourse,
  validateUpdateCourse
};
export default validators;