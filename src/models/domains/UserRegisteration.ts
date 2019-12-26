import { ISchool, SignupMethods } from '../entities/ISchool';
import { Role } from '../Role';
import { Status, IUserWithRegistration } from '../entities/IUser';
import { IInviteCode, EnrollmentType } from '../entities/IInviteCode';
import { threadId } from 'worker_threads';

interface IRequirements {
  status: Status;
  school?: { _id: string, name: string };
  sections?: { _id: string, name: string }[];
  enrollmentType?: EnrollmentType | SignupMethods;
  courses?: string[];
}

export class UserRegisteration {

  protected _requirements: IRequirements = { status: Status.inactive };
  protected _result: IUserWithRegistration;

  constructor(
    protected _dbSchool: ISchool | undefined,
    protected _user: IUserWithRegistration,
    protected _inviteCode: IInviteCode | undefined
  ) {
    if (this._inviteCode) {
      this.processInviteCode();
    } else {
      this.processRegistration();
    }
    this._result = this.getDbUser();
  }

  get license() {
    return this._dbSchool && this._dbSchool.license;
  }

  get sections() {
    return this._requirements.sections ? this._requirements.sections.map(section => section._id) : [];
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

  get dbUser(): IUserWithRegistration {
    return this._result;
  }

  protected getDbUser(): IUserWithRegistration {
    const { school, status, sections } = this._requirements;
    const now = new Date();
    return {
      ...this._user,
      ...(status === Status.active ?
        {
          school: {
            _id: school!._id,
            joinDate: now
          }
        } : {
          registration: {
            ...this._user.registration,
            school, sections, status
          }
        }
      )
    };
  }

  protected processRegistration() {
    const type = this._user.registration.provider === 'curio' ? SignupMethods.auto : SignupMethods.provider;
    const status = this.getRegistrationStatus(type);
    if (status !== Status.active) {
      this._requirements.status = status;
      return;
    }
    this._requirements = {
      school: this._user.registration.school,
      sections: this._user.registration.sections,
      enrollmentType: type,
      status: Status.active
    };
  }

  protected processInviteCode() {
    if (!this.isInviteCodeValid()) {
      this._requirements.status = Status.invalidInviteCode;
      return;
    }
    const { schoolId, enrollment } = this._inviteCode!;
    const { type, courses, sectionId } = enrollment;
    this._requirements = {
      ...this._requirements,
      status: this.getRegistrationStatus(SignupMethods.inviteCodes),
      sections: [{ _id: sectionId, name: sectionId }],
      school: { _id: schoolId, name: schoolId },
      courses: courses || [],
      enrollmentType: type
    };
  }

  protected getRegistrationStatus(neededMethod: SignupMethods) {
    if (!this._dbSchool) return Status.schoolNotRegistered;
    if (!this.license) return Status.schoolHasNoLicense;
    const { consumed, max } = this.license[`${this.role}s`];
    if (max - consumed < 1) return Status.outOfQuota;
    const { signupMethods, grades } = this.license.package;
    if (neededMethod === SignupMethods.provider) {
      if (!this._dbSchool.provider || this._dbSchool.provider._id !== this._user.registration.provider) {
        return Status.schoolHasNoLicense;
      }
      if (!grades[this._user.registration.grade]) {
        return Status.gradeNotPurchased;
      }
    }
    if (signupMethods.includes(neededMethod)) {
      return Status.active;
    } else {
      return Status.pendingApproval;
    }
  }

  protected isInviteCodeValid() {
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