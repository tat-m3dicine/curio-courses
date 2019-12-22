import { IConfig } from '../entities/IProvider';
import { IPackage, IAcademicTermRequest } from '../entities/ISchool';

export interface ICreateProviderRequest {
  _id: string;
  config: IConfig;
  package: IPackage;
  academicTerm?: IAcademicTermRequest;
}

export interface IUpdateProviderRequest {

}