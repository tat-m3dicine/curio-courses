import { ILocales, IAuditable } from './Common';

export interface ISection extends IAuditable {
  locales: ILocales;
  schoolId: string;
  grade: string;
  students: string[];
}