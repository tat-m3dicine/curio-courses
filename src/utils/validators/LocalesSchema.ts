import Validator, { ValidationError } from 'fastest-validator';

const validator = new Validator();
const localeRegExp = /^([a-z]{2})(-([a-z]{2}))?$/.compile();

const validateOneLocale = validator.compile({
  name: { type: 'string', min: 1 },
  description: {
    type: 'string',
    optional: true
  },
  $$strict: true
});

export const localesSchema = (...requiredLangs: string[]) => {
  return {
    type: 'custom',
    check(locales: { [lang: string]: object }) {
      const errors: ValidationError[] = [];
      const langs = Object.keys(locales);
      if (langs.length === 0) errors.push(validator.makeError('At least one language is required!'));
      for (const lang of requiredLangs) {
        if (!langs.includes(lang)) {
          errors.push(validator.makeError(`'${lang}' language is required!`));
        }
      }
      for (const lang of langs) {
        if (!localeRegExp.test(lang)) {
          errors.push(validator.makeError(`incorrect lanuage name format '${lang}'!`));
        }
        const isValidationPassed = validateOneLocale(locales[lang]);
        if (typeof isValidationPassed !== 'boolean') {
          errors.push(...isValidationPassed);
        }
      }
      return errors.length === 0 ? true : errors;
    }
  };
};