import { ISchool, SignupMethods } from '../entities/ISchool';
import { Role } from '../Role';
import { Status, IUserWithRegistration, IUser } from '../entities/IUser';
import { IInviteCode, EnrollmentType } from '../entities/IInviteCode';

interface IRequirements {
  school: { _id: string, name: string };
  sections: { _id: string, name: string }[];
  status: Status;
  courses: string[];
  enrollmentType?: EnrollmentType;
}

export class School {

  protected _requirements: IRequirements;

  constructor(protected _dbSchool: ISchool | undefined, protected _user: IUserWithRegistration) {
    this._requirements = {
      status: Status.inactive,
      school: _user.registration.school,
      sections: _user.registration.sections,
      courses: []
    };
  }

  get id() {
    return this._dbSchool && this._dbSchool._id;
  }

  get license() {
    return this._dbSchool && this._dbSchool.license;
  }

  getUserDbObject(): IUser {
    if (this._requirements.status === Status.active) {
      delete this._user.registration;
      const now = new Date();
      return {
        ...this._user,
        school: {
          _id: this._requirements.school._id,
          joinDate: now
        }
      };
    } else {
      delete this._user.school;
      const { school, sections, status } = this._requirements;
      return {
        ...this._user,
        registration: {
          ...this._user.registration,
          school, sections, status
        }
      };
    }
  }

  updateRegistrationStatus(role: Role) {
    this._requirements.status = this.getRegistrationStatus(role);
  }

  private getRegistrationStatus(role: Role) {
    if (!this._dbSchool) return Status.schoolNotRegistered;
    if (!this.license) return Status.outOfQuota;
    const { consumed, max } = this.license[`${role}s`];
    if (max - consumed < 1) return Status.outOfQuota;
    if (this.license.package.signupMethods.includes(SignupMethods.auto)) {
      return Status.active;
    } else {
      return Status.pendingApproval;
    }
  }

  processInviteCode(inviteCode: IInviteCode) {
    if (this.isInviteCodeValid(inviteCode)) {
      const { type, courses, sectionId } = inviteCode.enrollment;
      this._requirements = {
        ...this._requirements,
        status: Status.active,
        sections: [{ _id: sectionId, name: sectionId }],
        courses: courses || [],
        enrollmentType: type
      };
    } else {
      this._requirements.status = Status.invalidInviteCode;
    }
  }

  private isInviteCodeValid(inviteCode: IInviteCode) {
    if (!this.license) return false;
    if (!this.license.package.signupMethods.includes(SignupMethods.inviteCodes)) return false;
    if (!inviteCode.isEnabled) return false;
    const now = new Date();
    const { quota, validity: { fromDate, toDate } } = inviteCode;
    if (fromDate > now || now > toDate) return false;
    if (quota.max - quota.consumed < 1) return false;
    return true;
  }
}