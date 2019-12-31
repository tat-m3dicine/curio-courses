import { IConfig } from '../entities/IProvider';
import { ILicense } from '../entities/ISchool';
import { IUpdateAcademicTermRequest } from './ISchoolRequests';

export interface ICreateProviderRequest {
  _id: string;
  config: IConfig;
  license: ILicense;
  location: string;
  academicTerm?: IUpdateAcademicTermRequest;
}

export interface IUpdateProviderRequest {

}