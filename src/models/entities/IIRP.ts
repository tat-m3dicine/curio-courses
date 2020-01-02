import { IAuditable } from './Common';

export interface IIRPSection {
  _id: string;
  uuid: string;
  name: string;
  grade: string;
  schoolUuid: string;
  inviteCode: string;
  mpq: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IIRPUserMigrationRequest {
  _id: string;
  username: string;
  avatar: string;
  grade: string;
  sectionname: string;
  sectionuuid: string;
  schooluuid: string;
  name: string;
  key: string;
  role: string;
  preferences?: any[];
}

export interface ISignupRequest {
  user_id: string;
  provider: string;
  new_user_data: {
    name: string;
    avatar: string;
    preferences?: any[];
    role: string[];
    curriculum: string;
    grade: string;
    inviteCode?: string;
    school?: {
      name: string;
      uuid: string;
    };
    section?: {
      uuid: string;
      name: string;
    }[],
  };
}

export interface IIRPSchool extends IAuditable {
  uuid: string;
  name: string;
  curriculum: string;
  contactPerson: {
    name: string;
    phone: string;
    email: string;
  };
  grades: string[];
  subjects: string[];
  adminUsers: string[];
  providerLink: string[];
}