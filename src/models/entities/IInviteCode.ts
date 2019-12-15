import { IAuditable } from './Common';

export interface IInviteCode extends IAuditable {
  schoolId: string;
  quota: {
    max: number;
    consumed: number
  };
  validity: {
    fromDate: Date;
    toDate: Date
  };
  isEnabled: boolean;
  enrollment: {
    sectionId: string;
    type: EnrollmentType;
    courses?: string[];
  };
}

export enum EnrollmentType {
  courses = 'courses',
  none = 'none',
  auto = 'auto',
}