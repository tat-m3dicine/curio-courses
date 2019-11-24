import { ILocales, IAcademicTerm, IAuditable } from './Common';

export interface ISchool extends IAuditable {
  locales: ILocales;
  location: string;
  license: ILicense;
  academicTerms: IAcademicTerm[];
}

export interface ILicense {
  max: number;
  consumed: number;
  validFrom: Date;
  validTo: Date;
  reference: string;
  isEnabled: boolean;
  package: IPackage;
}

export interface IPackage {
  curriculums: string[];
  subjects: string[];
  grades: string[];
  features: string[];
}