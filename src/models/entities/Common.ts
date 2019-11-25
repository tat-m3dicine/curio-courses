export interface IAuditable {
  createdAt: Date;
  updatedAt: Date;
}

export interface ITeacher {
  _id: string;
  role: string;
  profile: IProfile;
  joinDate: Date;
  finishedDate?: Date;
}

export interface IStudent {
  _id: string;
  profile?: IProfile;
}

export interface ICourseStudent extends IStudent {
  joinDate: Date;
  isEnabled: boolean;
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
