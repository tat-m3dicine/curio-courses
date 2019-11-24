import { ILocales, IStudent, IAuditable } from './Common';

export interface ISection extends IAuditable {
  locales: ILocales;
  schoolId: string;
  grade: string;
  curriculum: string;
  students: IStudent[];
}