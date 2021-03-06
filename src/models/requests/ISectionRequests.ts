import { ILocales } from '../entities/Common';

export interface ICreateSectionRequest {
  _id?: string;
  locales: ILocales;
  schoolId: string;
  grade: string;
  students?: string[];
  courses?: ICreateSectionCourse[];
}

export interface ICreateSectionCourse {
  subject: string;
  curriculum: string;
  enroll?: boolean;
}