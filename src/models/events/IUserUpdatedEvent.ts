import { Status } from '../entities/IUser';

export interface IUserUpdatedEvent {
  isState?: boolean;
  event: string;
  data: IUserUpdatedData;
}

export interface IUserUpdatedData {
  _id: string;
  status: Status;
  schoolId: string | null;
  courses: IUserCourseUpdates[];
}

export interface IUserCourseUpdates {
  _id: string;
  sectionId: string;
  grade: string;
  subject: string;
  curriculum: string;
}