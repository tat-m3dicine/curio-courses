import generate from 'nanoid/non-secure/generate';
import { ILocales } from '../models/entities/Common';

const hexCharacters = '0123456789abcdef';
const newId = (length: number) => generate(hexCharacters, length);

export const newSchoolId = (name: string) => {
  return `${name.replace(/\s/g, '')}_${newId(5)}`.toUpperCase();
};

export const newSectionId = (schoolId: string, grade: string, locales: ILocales) => {
  return `${schoolId}_${locales.en.name}_${grade}`.replace(/\s/g, '').toUpperCase();
};

export const newCourseId = (sectionId: string, subject: string, year: string) => {
  return `${sectionId}_${subject}_${year}_${newId(3)}`.replace(/\s/g, '').toUpperCase();
};

export const newInviteCodeId = () => newId(8);
export const newProviderId = () => newId(10);
export const newAcademicTermId = () => newId(10);
