import { validateCreateSchool, validateUpdateSchool } from './SchoolsSchema';
import { validateCreateSection } from './SectionsSchema';
import { validateCreateLicense } from './LicenseSchema';
const validators = {
  validateCreateSchool,
  validateUpdateSchool,
  validateCreateLicense,
  validateCreateSection
};
export default validators;