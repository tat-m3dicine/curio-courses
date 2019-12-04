import { ILocales } from '../entities/Common';

export interface ICreateCourseRequest {
  schoolId: string;
  sectionId: string;
  curriculum: string;
  grade: string;
  subject: string;
  locales: ILocales;
  defaultLocale?: string;
  isEnabled?: boolean;
  teachers?: string[];
  students?: string[];
  academicTermId?: string;
}