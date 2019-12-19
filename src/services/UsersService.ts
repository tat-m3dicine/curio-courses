import validators from '../utils/validators';
import { CommandsProcessor } from './CommandsProcessor';
import { IUnitOfWork } from '@saal-oryx/unit-of-work';
import { UsersRepository } from '../repositories/UsersRepository';
import { IUser, Status } from '../models/entities/IUser';
import { IProfile } from '../models/entities/Common';
import { IRPUserRegistrationRquest, IIRPUserMigrationRequest } from '../models/entities/IIRP';
import loggerFactory from '../utils/logging';
const logger = loggerFactory.getLogger('UserSchema');

export class UsersService {

  constructor(protected _uow: IUnitOfWork, protected _commandsProcessor: CommandsProcessor) {
  }

  protected get usersRepo() {
    return this._uow.getRepository('Users') as UsersRepository;
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
        status: Status.active,
        joinDate
      }
    }));
    if (!users || users.length === 0) {
      logger.debug('No users found to migrate!');
      return [];
    }
    return this.usersRepo.addMany(users, false);
  }

  async register(request: IRPUserRegistrationRquest) {
    validators.validateRegisterUser(request);
    const { user_id, new_user_data: user, provider } = request;
    const userObj: IUser = {
      _id: user_id,
      role: user.role,
      profile: {
        name: user.name,
        avatar: user.avatar
      },
      registration: {
        grade: user.grade,
        school: {
          _id: user.school.uuid,
          name: user.school.name
        },
        sections: user.section.map(section => ({
          _id: section.uuid,
          name: section.name
        })),
        provider
      }
    };
    return this.usersRepo.add(userObj);
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