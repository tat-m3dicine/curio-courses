import { ISchool, SignupMethods } from '../entities/ISchool';
import { Role } from '../Role';
import { Status, IUserWithRegistration } from '../entities/IUser';
import { IInviteCode, EnrollmentType } from '../entities/IInviteCode';
import { ICourse, IUserCourseInfo } from '../entities/ICourse';
import { newCourseId } from '../../utils/IdGenerator';
import { InvalidRequestError } from '../../exceptions/InvalidRequestError';

interface IRequirements {
  status: Status;
  school?: { _id: string, name: string };
  sections?: { _id: string, name: string }[];
  enrollmentType?: EnrollmentType;
  courses?: string[] | ICourse[];
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

  get status() {
    return this._requirements.status;
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
    const isProvider = this._user.registration.provider !== 'curio';
    const type = isProvider ? SignupMethods.provider : SignupMethods.auto;
    const status = this.getRegistrationStatus(type);
    if (status !== Status.active) {
      this._requirements.status = status;
      return;
    }
    this._requirements = {
      status: Status.active,
      school: this._user.registration.school,
      sections: this._user.registration.sections,
      enrollmentType: isProvider ? EnrollmentType.courses : EnrollmentType.auto,
      courses: isProvider ? this.getCoursesFromSchool() : undefined
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
    if (!this.license) return false;
    if (!this.license.package.signupMethods.includes(SignupMethods.inviteCodes)) return false;
    const now = new Date();
    const { quota, validity: { fromDate, toDate }, isEnabled } = this._inviteCode!;
    if (fromDate > now || now > toDate) return false;
    if (quota.max - quota.consumed < 1) return false;
    if (!isEnabled) return false;
    return true;
  }

  protected getCoursesFromSchool() {
    const now = new Date();
    const { academicTerms, _id: schoolId } = this._dbSchool!;
    const academicTerm = academicTerms.find(term => term.startDate < now && now < term.endDate);
    if (!academicTerm) throw new InvalidRequestError('Provider school has no valid academic term for courses creation!');
    const { grade, sections = [] } = this._user.registration;
    const subjects = this.license!.package.grades[grade];
    const courses: ICourse[] = [];
    for (const section of sections) {
      for (const subject in subjects) {
        courses.push({
          _id: newCourseId(section._id, subject, academicTerm.year),
          grade, academicTerm, schoolId, subject,
          sectionId: section._id,
          defaultLocale: 'en',
          locales: { en: { name: section.name } },
          curriculum: subjects[subject][0],
          isEnabled: true,
          teachers: <IUserCourseInfo[]>[],
          students: [{ _id: this._user._id, joinDate: now, isEnabled: true }]
        });
      }
    }
    return courses;
  }
}