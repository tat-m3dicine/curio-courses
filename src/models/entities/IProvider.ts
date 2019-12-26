import { IAcademicTerm, IAuditable } from './Common';
import { IPackage } from './ISchool';

export interface IProvider extends IAuditable {
  _id: string;
  config: IConfig;
  location: string;
  package: IPackage;
  academicTerms?: IAcademicTerm[];
}

export interface IConfig {
  autoCreateSchool: boolean;
  autoCreateSection: boolean;
  autoCreateCourse: boolean;
}