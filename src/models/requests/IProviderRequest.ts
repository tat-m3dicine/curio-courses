import { IConfig } from '../entities/IProvider';
import { IPackage } from '../entities/ISchool';
import { IUpdateAcademicTermRequest } from './ISchoolRequests';

export interface ICreateProviderRequest {
  _id: string;
  config: IConfig;
  package: IPackage;
  location: string;
  academicTerm?: IUpdateAcademicTermRequest;
}

export interface IUpdateProviderRequest {

}