import { ILocales, IAcademicTerm, IAuditable } from './Common';

export interface ICourse extends IAuditable {
  schoolId: string;
  sectionId: string;
  curriculum: string;
  grade: string;
  subject: string;
  defaultLocale: string;
  locales: ILocales;
  isEnabled: boolean;
  teachers: IUserCourseInfo[];
  students: IUserCourseInfo[];
  academicTerm: IAcademicTerm;
}

export interface IUserCourseInfo {
  _id: string;
  joinDate: Date;
  finishDate?: Date;
  isEnabled: boolean;
}