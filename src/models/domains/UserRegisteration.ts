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

export class UserRegisteration {

  protected _requirements: IRequirements;
  protected _result: IUser;

  constructor(protected _dbSchool: ISchool | undefined, protected _user: IUserWithRegistration, protected _inviteCode?: IInviteCode) {
    this._requirements = {
      status: Status.inactive,
      school: _user.registration.school,
      sections: _user.registration.sections,
      courses: []
    };
    this._result = this.getDbUser();
  }

  get license() {
    return this._dbSchool && this._dbSchool.license;
  }

  get sections() {
    return this._requirements.sections.map(section => section._id);
  }

  get courses() {
    return this._requirements.courses;
  }

  get enrollmentType() {
    return this._requirements.enrollmentType;
  }

  get role(): Role {
    return this._user.role.includes(Role.teacher) ? Role.teacher : Role.student;
  }

  get dbUser(): IUser {
    return this._result;
  }

  getDbUser(): IUser {
    if (this._inviteCode) {
      this.processInviteCode();
    } else {
      this._requirements.status = this.getRegistrationStatus();
    }
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



  private getRegistrationStatus() {
    if (!this._dbSchool) return Status.schoolNotRegistered;
    if (!this.license) return Status.outOfQuota;
    const { consumed, max } = this.license[`${this.role}s`];
    if (max - consumed < 1) return Status.outOfQuota;
    if (this.license.package.signupMethods.includes(SignupMethods.auto)) {
      return Status.active;
    } else {
      return Status.pendingApproval;
    }
  }

  private processInviteCode() {
    if (!this.isInviteCodeValid()) {
      this._requirements.status = Status.invalidInviteCode;
      return;
    }
    const { type, courses, sectionId } = this._inviteCode!.enrollment;
    this._requirements = {
      ...this._requirements,
      status: Status.active,
      sections: [{ _id: sectionId, name: sectionId }],
      courses: courses || [],
      enrollmentType: type
    };
  }

  private isInviteCodeValid() {
    if (!this._inviteCode) return false;
    if (!this.license) return false;
    if (!this.license.package.signupMethods.includes(SignupMethods.inviteCodes)) return false;
    if (!this._inviteCode.isEnabled) return false;
    const now = new Date();
    const { quota, validity: { fromDate, toDate } } = this._inviteCode;
    if (fromDate > now || now > toDate) return false;
    if (quota.max - quota.consumed < 1) return false;
    return true;
  }
}