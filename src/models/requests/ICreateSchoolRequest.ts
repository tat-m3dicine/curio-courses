import { ILocales } from '../entities/Common';

export interface ICreateSchoolRequest {
  locales: ILocales;
  location: string;
}