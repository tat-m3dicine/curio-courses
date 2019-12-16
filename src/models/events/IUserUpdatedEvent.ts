import { Role } from '../Role';

export interface IUserUpdatedEvent {
  _id: string;
  role: Role;
  schoolId: string;
  courses: IUserCourseUpdates[];
}

export interface IUserCourseUpdates {
  _id: string;
  sectionId: string;
  grade: string;
  subject: string;
  joinDate: Date;
  finishDate?: Date;
}