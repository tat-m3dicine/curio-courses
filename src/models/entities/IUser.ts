import { IProfile, IAuditable } from './Common';

export interface IUser extends IAuditable {
  profile: IProfile;
  role: string[];
  school?: {
    _id: string;
    joinDate: Date;
  };
  registration?: IRegistration;
}

export interface IUserWithRegistration extends IUser {
  registration: IRegistration;
}

export interface IRegistration {
  school: { _id: string, name: string };
  sections: { _id: string, name: string }[];
  status: Status;
  grade: string;
  curriculum: string;
  provider: string;
  inviteCode?: string;
}

// TODO: validate against status when enrolling users
export enum Status {
  active = 'active',
  inactive = 'inactive',
  outOfQuota = 'out_of_quota',
  pendingApproval = 'pending_approval',
  invalidInviteCode = 'invalid_invite_code',
  schoolNotRegistered = 'school_not_registered',
}