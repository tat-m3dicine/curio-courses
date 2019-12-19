import { IProfile, IAuditable } from './Common';

export interface IUser extends IAuditable {
  profile: IProfile;
  role: string[];
  school?: {
    _id: string;
    joinDate: Date;
    finishDate?: Date;
  };
  registration?: {
    school: { _id: string, name: string };
    sections: { _id: string, name: string }[];
    status: Status;
    grade: string;
    provider: string;
  };
}

// TODO: validate against status when enrolling users
export enum Status {
  active = 'active',
  inactive = 'inactive',
  out_of_quota = 'out_of_quota',
  pending_approval = 'pending_approval',
  school_not_registered = 'school_not_registered',
}