import { IProfile, IAuditable } from './Common';
import { ICourse } from './ICourse';

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

export interface IUserWithCourses extends IUser {
  courses: Partial<ICourse>[];
}

export interface IRegistration {
  school?: { _id: string, name: string };
  sections?: { _id: string, name: string }[];
  inviteCode?: string;
  status: Status;
  grade: string;
  curriculum: string;
  provider: string;
}

export enum Status {
  active = 'active',
  inactive = 'inactive',
  outOfQuota = 'out_of_quota',
  pendingApproval = 'pending_approval',
  invalidInviteCode = 'invalid_invite_code',
  gradeNotPurchased = 'grade_not_purchased',
  schoolHasNoLicense = 'school_has_no_license',
  schoolNotRegistered = 'school_not_registered',
}