import { IEntity } from '@saal-oryx/unit-of-work';
import { IProfile } from './Common';

export interface IUsers extends IEntity {
    profile: IProfile;
    role: string[];
    registration: {
      schoolId: string;
      joinDate: Date;
      finishedDate?: Date;
    };
  }