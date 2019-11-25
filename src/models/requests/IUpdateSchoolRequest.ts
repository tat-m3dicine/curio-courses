import { ILocales } from '../entities/Common';

export interface IUpdateSchoolRequest {
  locales: ILocales;
  location: string;
}