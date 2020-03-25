import { IProfile, IAuditable } from './Common';
import { ICourseInfo } from './ICourse';

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
  courses: ICourseInfo[];
}

export interface IRegistration {
  school?: { _id: string, name: string };
  sections?: IRegistrationSection[];
  inviteCode?: string;
  status: Status;
  curriculum: string;
  provider: string;
  grade: string;
}

export interface IRegistrationSection {
  _id: string;
  name: string;
  grade: string;
  subjects?: string[];
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