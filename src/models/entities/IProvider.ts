import { IAcademicTerm, IAuditable } from './Common';
import { ILicense } from './ISchool';

export interface IProvider extends IAuditable {
  _id: string;
  config: IConfig;
  location: string;
  license: ILicense;
  academicTerms?: IAcademicTerm[];
}

export interface IConfig {
  autoCreateSchool: boolean;
  autoCreateSection: boolean;
  autoCreateCourse: boolean;
}

export interface IAcademicTermRequest {
  year: string;
  term: string;
  startDate: Date;
  endDate: Date;
  gracePeriod: number;
  isEnabled: boolean;
}

export interface IDeleteProviderAcademicTermRequest {
  providerId: string;
  academicTermId: string;
}

