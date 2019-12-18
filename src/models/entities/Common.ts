import { IEntity } from '@saal-oryx/unit-of-work';

export interface IAuditable extends IEntity {
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProfile {
  name: string;
  avatar: string;
}

export interface IAcademicTerm {
  _id: string;
  year: string;
  term: string;
  startDate: Date;
  endDate: Date;
  gracePeriod: number;
  isEnabled: boolean;
}

export interface ILocales {
  [lang: string]: {
    name: string;
    description: string;
  };
}
