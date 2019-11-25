import { validateCreateSchool, validateUpdateSchool } from './SchoolsSchema';
import { validateCreateLicense } from './LicenseSchema';
const validators = {
  validateCreateSchool,
  validateUpdateSchool,
  validateCreateLicense
};
export default validators;