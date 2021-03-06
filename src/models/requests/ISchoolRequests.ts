import { ILocales } from '../entities/Common';
import { IPackage } from '../entities/ISchool';

export interface ICreateSchoolRequest {
  _id?: string;
  locales: ILocales;
  location: string;
}

export interface IUpdateSchoolRequest {
  locales: ILocales;
  location: string;
}

export interface IPatchSchoolTermRequest {
  _id: string;
  endDate: Date;
  gracePeriod: number;
}

export interface ICreateLicenseRequest {
  students: number;
  teachers: number;
  validTo: Date;
  reference: string;
  isEnabled: boolean;
  package: IPackage;
  students_consumed?: number;
  teachers_consumed?: number;
}

export interface IUpdateAcademicTermRequest {
  year: string;
  term: string;
  startDate: Date;
  endDate: Date;
  gracePeriod: number;
  isEnabled: boolean;
}

export interface IDeleteAcademicTermRequest {
  _id: string;
  academicTermId: string;
}

export interface IUpdateUserRequest {
  _id: string;
  permissions: string[];
}