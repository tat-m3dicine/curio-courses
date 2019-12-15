import { IProfile, IAuditable } from './Common';

export interface IUser extends IAuditable {
    profile: IProfile;
    role: string[];
    registration: {
      schoolId: string;
      joinDate: Date;
      finishedDate?: Date;
    };
  }