import { ILocales, IStudent, ITeacher } from '../entities/Common';

export interface ICreateCourseRequest {
  schoolId: string;
  sectionId: string;
  curriculum: string;
  grade: string;
  subject: string;
  locales: ILocales;
  defaultLocale?: string;
  isEnabled?: boolean;
  teachers?: ITeacher[];
  students?: IStudent[];
  academicTerm: string;
}