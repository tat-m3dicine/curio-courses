import { ILocales, ITeacher, IAcademicTerm, ICourseStudent, IAuditable } from './Common';

export interface ICourse extends IAuditable {
  locales: ILocales;
  subjectId: string;
  schoolId: string;
  sectionId: string;
  curriculum: string;
  grade: string;
  defaultLocale: string;
  isEnabled: boolean;
  teachers: ITeacher[];
  students: ICourseStudent[];
  kg: {
    id: string;
    chapters: any[];
  };
  academicTerm: IAcademicTerm;
}