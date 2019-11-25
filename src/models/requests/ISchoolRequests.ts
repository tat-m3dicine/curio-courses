import { ILocales } from '../entities/Common';
import { IPackage } from '../entities/ISchool';

export interface ICreateSchoolRequest {
  locales: ILocales;
  location: string;
}

export interface IUpdateSchoolRequest {
  locales: ILocales;
  location: string;
}

export interface ICreateLicenseRequest {
  students: number;
  teachers: number;
  validTo: Date;
  reference: string;
  isEnabled: boolean;
  package: IPackage;
}