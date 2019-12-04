import { ILocales, IUser, IAcademicTerm, IAuditable } from './Common';
import { IEntity } from '@saal-oryx/unit-of-work';

export interface ICourse extends Partial<IAuditable>, IEntity {
  schoolId: string;
  sectionId: string;
  curriculum: string;
  grade: string;
  subject: string;
  defaultLocale: string;
  locales: ILocales;
  isEnabled: boolean;
  teachers: IUser[];
  students: IUser[];
  academicTerm: IAcademicTerm;
}