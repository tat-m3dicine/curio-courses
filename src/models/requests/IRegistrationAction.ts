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
  reject = 'reject',
  switch = 'switch',
}

export interface ISwitchRegistrationAction {
  fromSchoolId: string;
  toSchoolId: string;
  action: RegistrationAction.switch;
  role: Role;
  users: string[];
}