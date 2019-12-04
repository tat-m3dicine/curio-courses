import { IPackage } from '../entities/ISchool';

export interface ILicenseRequest {
  students: { max?: number, consumed?: number };
  teachers: { max?: number, consumed?: number };
  validFrom: Date;
  validTo: Date; // *
  reference: string;
  isEnabled: boolean; // enable/disable
  package: IPackage; // *
}