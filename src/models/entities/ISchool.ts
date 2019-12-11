import { ILocales, IAcademicTerm, IAuditable } from './Common';
import { IEntity } from '@saal-oryx/unit-of-work';

export interface ISchool extends Partial<IAuditable>, IEntity {
  locales: ILocales;
  location: string;
  license?: ILicense;
  academicTerms: IAcademicTerm[];
  users: ISchoolUserPermissions[];
}

export interface ISchoolUserPermissions {
  _id: string;
  permissions: string[];
}
export interface ILicense {
  students: {
    max: number; // *
    consumed: number;
  };
  teachers: {
    max: number; // *
    consumed: number;
  };
  validFrom: Date;
  validTo: Date; // *
  reference: string;
  isEnabled: boolean; // enable/disable
  package: IPackage; // *
}

export interface IPackage {
  grades: {
    [grade: string]: {
      [subject: string]: string[] // curriculums
    }
  };
  features: string[];
}

export interface IAcademicTermRequest {
  year: string;
  term: string;
  startDate: Date;
  endDate: Date;
  gracePeriod: number;
  isEnabled: boolean;
}