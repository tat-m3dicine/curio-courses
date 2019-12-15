import { ILocales, IAcademicTerm, IAuditable } from './Common';

export interface ISchool extends IAuditable {
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
    joinBy: 'invite_code' | 'auto' | 'manual'
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