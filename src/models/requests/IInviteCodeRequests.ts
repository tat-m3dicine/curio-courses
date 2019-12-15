import { EnrollmentType } from '../entities/IInviteCode';

export interface ICreateInviteCodeRequest {
  schoolId: string;
  quota: number;
  validity: {
    fromDate: Date;
    toDate: Date;
  };
  enrollment: {
    sectionId: string;
    type: EnrollmentType;
    courses?: string[];
  };
}
