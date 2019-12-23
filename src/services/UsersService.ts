import validators from '../utils/validators';
import { CommandsProcessor } from './CommandsProcessor';
import { IUnitOfWork } from '@saal-oryx/unit-of-work';
import { UsersRepository } from '../repositories/UsersRepository';
import { IUser, Status, IUserWithRegistration } from '../models/entities/IUser';
import { IProfile } from '../models/entities/Common';
import { ISignupRequest } from '../models/entities/IIRP';
import loggerFactory from '../utils/logging';
import { InviteCodesRepository } from '../repositories/InviteCodesRepository';
import { IInviteCode, EnrollmentType } from '../models/entities/IInviteCode';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import { Role } from '../models/Role';
import { UserRegisteration } from '../models/domains/UserRegisteration';
import { SectionsRepository } from '../repositories/SectionsRepository';
import { CoursesRepository } from '../repositories/CoursesRepository';
const logger = loggerFactory.getLogger('UserSchema');

export class UsersService {

  constructor(protected _uow: IUnitOfWork, protected _commandsProcessor: CommandsProcessor) {
  }

  protected get usersRepo() {
    return this._uow.getRepository('Users', true) as UsersRepository;
  }

  protected get schoolsRepo() {
    return this._uow.getRepository('Schools', true) as SchoolsRepository;
  }

  protected get inviteCodesRepo() {
    return this._uow.getRepository('InviteCodes', true) as InviteCodesRepository;
  }

  protected get sectionsRepo() {
    return this._uow.getRepository('Sections', true) as SectionsRepository;
  }

  protected get coursesRepo() {
    return this._uow.getRepository('Courses', true) as CoursesRepository;
  }

  async signup(request: ISignupRequest) {
    validators.validateRegisterUser(request);
    const user = this.transformToUser(request);
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
    if (!dbSchool && registration.provider !== 'curio') {

    }
    const { dbUser, sections, courses, enrollmentType } = new UserRegisteration(dbSchool, user);
    if (dbUser.school) {
      await this.doRegisterUser(dbUser, inviteCode);
      if (enrollmentType === EnrollmentType.auto) {
        await this.doEnrollCourses(dbUser, sections);
      } else if (enrollmentType === EnrollmentType.courses) {
        await this.doEnrollCourses(dbUser, sections, courses);
      }
    } else {
      await this.usersRepo.addRegisteration(dbUser);
    }
    return this._uow.commit();
  }

  async doRegisterUser(user: IUser, inviteCode?: IInviteCode) {
    await this.usersRepo.assignSchool(user);
    if (user.school) {
      await this.schoolsRepo.incrementConsumedCount(user.school._id, this.getRole(user));
    }
    if (inviteCode) {
      await this.inviteCodesRepo.incrementConsumedCount(inviteCode._id);
    }
  }

  async doEnrollCourses(user: IUser, sections: string[], courses?: string[]) {
    await this.sectionsRepo.addStudents({ _id: { $in: sections } }, [user._id]);
    if (!courses) {
      const activeCourses = await this.coursesRepo.getActiveCoursesUnderSections(sections);
      courses = activeCourses.map(course => course._id);
    }
    await this.coursesRepo.addUsersToCourses([{
      filter: { _id: { $in: courses } },
      usersObjs: [{ _id: user._id, joinDate: new Date(), isEnabled: true }]
    }], this.getRole(user));
  }

  private getRole(user: IUser): Role {
    return user.role.includes(Role.teacher) ? Role.teacher : Role.student;
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
    await this.usersRepo.patch({ _id: request.user_id }, userObj);
    return this._uow.commit();
  }

  private transformToUser({ user_id, new_user_data: data, provider }: ISignupRequest) {
    return <IUserWithRegistration>{
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
  }
}