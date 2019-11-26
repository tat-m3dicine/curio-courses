import { ILocales } from '../entities/Common';

export interface ICreateSectionRequest {
  locales: ILocales;
  schoolId: string;
  grade: string;
}