import validators from '../utils/validators';
import { CommandsProcessor } from './CommandsProcessor';
import { IUnitOfWork } from '@saal-oryx/unit-of-work';
import { UsersRepository } from '../repositories/UsersRepository';
import { IUser, Status, IUserWithRegistration } from '../models/entities/IUser';
import { IProfile } from '../models/entities/Common';
import { ISignupRequest } from '../models/entities/IIRP';
import loggerFactory from '../utils/logging';
import { InviteCodesRepository } from '../repositories/InviteCodesRepository';
import { IInviteCode } from '../models/entities/IInviteCode';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import { Role } from '../models/Role';
import { School } from '../models/domains/School';
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

  async signup(request: ISignupRequest) {
    validators.validateRegisterUser(request);
    const { user_id, new_user_data: data, provider } = request;
    const user: IUserWithRegistration = {
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

  private async register(user: IUserWithRegistration) {
    const { registration } = user;
    let schoolId = registration.school && registration.school._id;
    let inviteCode: IInviteCode | undefined;

    if (registration.inviteCode) {
      inviteCode = await this.getInviteCode(registration.inviteCode);
      if (inviteCode) schoolId = inviteCode.schoolId;
    }

    const dbSchool = await this.schoolsRepo.findById(schoolId);
    const school = new School(dbSchool, user);
    if (inviteCode) {
      school.processInviteCode(inviteCode);
    } else {
      const role = user.role.includes(Role.teacher) ? Role.teacher : Role.student;
      school.updateRegistrationStatus(role);
    }

    const dbUser: IUser = school.getUserDbObject();
    if (dbUser.school) {
      return this.usersRepo.assignSchool(user);
    } else {
      return this.usersRepo.addRegisteration(user);
    }
    // TO ADD SECTION REGISTERATION
    // TO ADD COURSES  REGISTERATION
  }

  private async getInviteCode(codeId: string) {
    return this.inviteCodesRepo.findById(codeId);
  }

  async update(request: ISignupRequest) {
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