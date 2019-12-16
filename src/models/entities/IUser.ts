import { IProfile, IAuditable } from './Common';

export interface IUser extends IAuditable {
  profile: IProfile;
  role: string[];
  registration: {
    schoolId: string;
    status: Status;
    joinDate: Date;
    finishDate?: Date;
  };
}

// TODO: validate against status when enrolling users
export enum Status {
  active = 'active',
  inactive = 'inactive',
  withdrawn = 'withdrawn',
  out_of_quota = 'out_of_quota',
  pending_approval = 'pending_approval',
}