import { Role } from '../Role';

export interface IRegistrationAction {
  schoolId: string;
  action: 'approve' | 'withdraw' | 'reject';
  role: Role;
  users: string[];
}