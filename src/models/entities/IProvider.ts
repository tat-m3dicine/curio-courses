import {  IAcademicTerm, IAuditable } from './Common';

export interface IProvider extends IAuditable {
  _id: string;
  config: IConfig;
  package: IPackage;
  academicTerms?: IAcademicTerm[];
}

export interface IConfig {
  autoCreateSchool: boolean;
  autoCreateSection: boolean;
  autoCreateCourse: boolean;
}

export interface IPackage {
  grades: {
    [grade: string]: {
      [subject: string]: string[] // curriculums
    }
  };
  features: string[];
  signupMethods: SignupMethods[];
}

export enum SignupMethods {
  invite_codes = 'invite_codes',
  manual = 'manual',
  auto = 'auto'
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
  _id: string;
  academicTermId: string;
}
