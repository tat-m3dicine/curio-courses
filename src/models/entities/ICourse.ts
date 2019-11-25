import { ILocales, ITeacher, IAcademicTerm, ICourseStudent, IAuditable } from './Common';
import { IEntity } from '@saal-oryx/unit-of-work';

export interface ICourse extends Partial<IAuditable>, IEntity {
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
    _id: string;
    chapters: any[];
  };
  academicTerm: IAcademicTerm;
}