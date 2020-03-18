import { Role } from '../Role';

export interface IUserRequest {
  schoolId: string;
  sectionId?: string;
  courseId: string;
  usersIds: string[];
  role: Role;
}