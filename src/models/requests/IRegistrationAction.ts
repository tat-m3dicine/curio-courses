import { Role } from '../Role';

export interface IRegistrationAction {
  schoolId: string;
  action: RegistrationAction;
  role: Role;
  users: string[];
}

export enum RegistrationAction {
  approve = 'approve',
  withdraw = 'withdraw',
  reject = 'reject'
}