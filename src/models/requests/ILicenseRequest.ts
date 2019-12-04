import { IPackage } from '../entities/ISchool';

export interface ILicenseRequest {
  students: { max: number };
  teachers: { max: number };
  validFrom: Date;
  validTo: Date; // *
  reference: string;
  isEnabled: boolean; // enable/disable
  package: IPackage; // *
  students_consumed?: number;
  teachers_consumed?: number;
}