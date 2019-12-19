import validators from '../utils/validators';
import { CommandsProcessor } from './CommandsProcessor';
import { IUnitOfWork } from '@saal-oryx/unit-of-work';
import { UsersRepository } from '../repositories/UsersRepository';
import { IUser, Status } from '../models/entities/IUser';
import { IProfile } from '../models/entities/Common';
import { IRPUserRegistrationRquest, IIRPUserMigrationRequest } from '../models/entities/IIRP';
import loggerFactory from '../utils/logging';
import { InviteCodesRepository } from '../repositories/InviteCodesRepository';
import { IInviteCode } from '../models/entities/IInviteCode';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import { ISchool, SignupMethods, ILicense } from '../models/entities/ISchool';
import { Role } from '../models/Role';
const logger = loggerFactory.getLogger('UserSchema');

export class UsersService {

  constructor(protected _uow: IUnitOfWork, protected _commandsProcessor: CommandsProcessor) {
  }

  protected get usersRepo() {
    return this._uow.getRepository('Users') as UsersRepository;
  }

  protected get schoolsRepo() {
    return this._uow.getRepository('Schools') as SchoolsRepository;
  }

  protected get inviteCodesRepo() {
    return this._uow.getRepository('InviteCodes') as InviteCodesRepository;
  }

  async migrate(requests: IIRPUserMigrationRequest[]) {
    const joinDate = new Date();
    requests = requests.filter(request => {
      return validators.validateMigrateUser(request);
    });
    const users: IUser[] = requests.map(user => ({
      _id: user._id,
      role: [user.role.toLowerCase()],
      profile: {
        name: user.name,
        avatar: user.avatar
      },
      school: {
        _id: user.schooluuid,
        joinDate
      }
    }));
    if (!users || users.length === 0) {
      logger.debug('No users found to migrate!');
      return [];
    }
    return this.usersRepo.addMany(users, false);
  }

  async registerFromIRP(request: IRPUserRegistrationRquest) {
    validators.validateRegisterUser(request);
    const { user_id, new_user_data: data, provider } = request;
    const user: IUser = {
      _id: user_id,
      role: data.role,
      profile: {
        name: data.name,
        avatar: data.avatar
      },
      registration: {
        grade: data.grade,
        status: Status.pendingApproval,
        school: {
          _id: data.school.uuid,
          name: data.school.name
        },
        sections: data.section.map(section => ({
          _id: section.uuid,
          name: section.name
        })),
        provider: provider || 'curio',
        inviteCode: data.inviteCode
      }
    };
    await this.register(user);
  }

  private async register(user: IUser) {
    const now = new Date();
    if (!user.registration) throw new InvalidRequestError('No registration information were sent!');
    let obj: any = {
      school: user.registration.school,
      status: Status.inactive,
      sections: user.registration.sections,
      courses: []
    };
    if (user.registration.inviteCode) {
      const inviteCodeRequest = await this.processInviteCode(user.registration.inviteCode);
      if (inviteCodeRequest.status !== Status.active) {
        user.registration.status = inviteCodeRequest.status;
        return this.usersRepo.addRegisteration(user);
      }
      obj = { ...obj, ...inviteCodeRequest };
    }
    user.registration.school = obj.school;
    const role = user.role.includes(Role.teacher) ? Role.teacher : Role.student;
    const result = await this.validateSchoolEnrollment(obj.school, role);
    obj.status = result;
    if (result !== Status.active) {
      user.registration.status = obj.status;
      return this.usersRepo.addRegisteration(user);
    } else {
      return this.usersRepo.assignSchool(user, now);
    }
    // TO ADD SECTION REGISTERATION
    // TO ADD COURSES  REGISTERATION
  }

  private async processInviteCode(codeId: string) {
    const inviteCode: IInviteCode | undefined = await this.inviteCodesRepo.findById(codeId);
    if (!inviteCode) return { status: Status.invalidInviteCode };
    const school: ISchool | undefined = await this.schoolsRepo.findById(inviteCode.schoolId);

    if (!school || !school.license) return { status: Status.invalidInviteCode };
    if (!this.isInviteCodeValid(inviteCode, school.license)) return { status: Status.invalidInviteCode, school };
    return {
      school,
      status: Status.active,
      sections: [{ _id: inviteCode.enrollment.sectionId }],
      ...inviteCode.enrollment
    };
  }

  private async validateSchoolEnrollment(school: ISchool, role: Role) {
    if (!school) return Status.schoolNotRegistered;
    if (!school.academicTerms) {
      const result = await this.schoolsRepo.findById(school._id);
      if (!result) return Status.schoolNotRegistered;
      else school = result;
    }
    if (!school.license) return Status.outOfQuota;
    const { consumed, max } = school.license[`${role}s`];
    if (max - consumed < 1) return Status.outOfQuota;
    if (school.license.package.signupMethods.includes(SignupMethods.auto)) {
      return Status.active;
    } else {
      return Status.pendingApproval;
    }
  }

  private isInviteCodeValid(inviteCode: IInviteCode, license: ILicense) {
    if (!license.package.signupMethods.includes(SignupMethods.inviteCodes)) return false;
    if (!inviteCode.isEnabled) return false;
    const now = new Date();
    const { quota, validity: { fromDate, toDate } } = inviteCode;
    if (fromDate > now || now > toDate) return false;
    if (quota.max - quota.consumed < 1) return false;
    return true;
  }

  async update(request: IRPUserRegistrationRquest) {
    validators.validateUpdateUser(request);
    const user = request.new_user_data;
    const userObj: Partial<IUser> = {};
    if (user.role) userObj.role = user.role;
    if (user.name || user.avatar) {
      userObj.profile = <IProfile>{};
      if (user.name) userObj.profile.name = user.name;
      if (user.avatar) userObj.profile.avatar = user.avatar;
    }
    return this.usersRepo.patch({ _id: request.user_id }, userObj);
  }
}