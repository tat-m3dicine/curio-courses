import generate from 'nanoid/non-secure/generate';
import { ILocales } from '../models/entities/Common';

const hexCharacters = '0123456789abcdef';
const newId = (length: number) => generate(hexCharacters, length);
const normalizeString = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '').replace(/\s/g, '');

export const newSchoolId = (name: string) => {
  return `${normalizeString(name)}_${newId(5)}`.toUpperCase();
};

export const newSectionId = (schoolId: string, grade: string, locales: ILocales) => {
  return `${schoolId}_${normalizeString(locales.en.name)}_${grade}`.toUpperCase();
};

export const newCourseId = (sectionId: string, subject: string, year: string) => {
  return `${sectionId}_${subject}_${year}_${newId(3)}`.toUpperCase();
};

export const newInviteCodeId = () => newId(8);
export const newProviderId = () => newId(10);
export const newAcademicTermId = () => newId(10);
