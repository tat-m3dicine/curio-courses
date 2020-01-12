import validators from '../utils/validators';
import { IUnitOfWork } from '@saal-oryx/unit-of-work';
import { UsersRepository } from '../repositories/UsersRepository';
import { IUser, Status, IUserWithRegistration } from '../models/entities/IUser';
import { IProfile } from '../models/entities/Common';
import { ISignupRequest, IUserData } from '../models/entities/IIRP';
import loggerFactory from '../utils/logging';
import { InviteCodesRepository } from '../repositories/InviteCodesRepository';
import { IInviteCode, EnrollmentType } from '../models/entities/IInviteCode';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import { Role } from '../models/Role';
import { UserRegisteration } from '../models/domains/UserRegisteration';
import { SectionsRepository } from '../repositories/SectionsRepository';
import { CoursesRepository } from '../repositories/CoursesRepository';
import { ProvidersRepository } from '../repositories/ProvidersRepository';
import { IProvider } from '../models/entities/IProvider';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';
import { ISchool } from '../models/entities/ISchool';
import { newSchoolId, newSectionId } from '../utils/IdGenerator';
import { getNotMatchingObjects } from '../utils/validators/AllObjectsExist';
import { ISection } from '../models/entities/ISection';
import config from '../config';
import { Repo } from '../repositories/RepoNames';
import { IUserUpdatedData } from '../models/events/IUserUpdatedEvent';
import { NotFoundError } from '../exceptions/NotFoundError';
import { KafkaService } from './processors/KafkaService';
import { Events } from './processors/UpdatesProcessor';
const logger = loggerFactory.getLogger('UserSchema');

export class UsersService {

  private provider?: IProvider;

  constructor(protected _uow: IUnitOfWork, protected _kafkaService: KafkaService) {
  }

  protected get usersRepo() {
    return this._uow.getRepository(Repo.users, true) as UsersRepository;
  }

  protected get schoolsRepo() {
    return this._uow.getRepository(Repo.schools, true) as SchoolsRepository;
  }

  protected get inviteCodesRepo() {
    return this._uow.getRepository(Repo.inviteCodes, true) as InviteCodesRepository;
  }

  protected get sectionsRepo() {
    return this._uow.getRepository(Repo.sections, true) as SectionsRepository;
  }

  protected get coursesRepo() {
    return this._uow.getRepository(Repo.courses, true) as CoursesRepository;
  }

  protected get providersRepo() {
    return this._uow.getRepository(Repo.providers, true) as ProvidersRepository;
  }

  async signup(request: ISignupRequest) {
    const user = this.transformToUser(request);
    return this.register(user);
  }

  private async register(user: IUserWithRegistration) {
    const { registration } = user;
    let schoolId = registration.school && registration.school._id;
    let inviteCode: IInviteCode | undefined;

    if (registration.inviteCode) {
      inviteCode = await this.inviteCodesRepo.findById(registration.inviteCode);
      if (inviteCode) schoolId = inviteCode.schoolId;
      else {
        inviteCode = <IInviteCode>{ isEnabled: false };
        schoolId = undefined;
      }
      registration.provider = 'curio';
    }

    let dbSchool: ISchool | undefined;
    if (schoolId) {
      if (registration.provider === 'curio') {
        dbSchool = await this.schoolsRepo.findById(schoolId);
      } else {
        dbSchool = await this.schoolsRepo.findOne({ 'provider.links': schoolId });
        if (!dbSchool && registration.school) {
          await this.validateProvider(registration.provider, 'School');
          dbSchool = await this.createSchool(registration.school, this.provider!);
        }
      }
    }
    return this.completeRegisteration(user, dbSchool, inviteCode);
  }

  protected async completeRegisteration(user: IUserWithRegistration, dbSchool?: ISchool, inviteCode?: IInviteCode) {
    const { dbUser, sections, courses, status, enrollmentType } = new UserRegisteration(dbSchool, user, inviteCode);
    if (dbUser.school) {
      await this.doRegisterUser(dbUser, dbUser.school._id, inviteCode && inviteCode._id);
      if (enrollmentType === EnrollmentType.auto) {
        await this.doEnrollCourses(dbUser, sections);
      } else if (enrollmentType === EnrollmentType.courses) {
        await this.doEnrollCourses(dbUser, sections, courses);
      }
    } else {
      await this.usersRepo.addRegisteration(dbUser);
    }

    const userCourses = await this.coursesRepo.getActiveCoursesForUsers(this.getRole(dbUser), [dbUser._id]);
    this.sendUpdate({
      _id: dbUser._id, status,
      // tslint:disable-next-line: no-null-keyword
      schoolId: dbUser.school ? dbUser.school._id : null,
      courses: userCourses.map(course => ({
        _id: course._id,
        sectionId: course.sectionId,
        grade: course.grade,
        subject: course.subject,
        curriculum: course.curriculum
      }))
    });
    return this._uow.commit();
  }

  protected sendUpdate(data: IUserUpdatedData) {
    this._kafkaService.send(config.kafkaUpdatesTopic, {
      data,
      key: data._id,
      event: Events.enrollment,
      timestamp: Date.now(),
      v: '1.0.0'
    });
  }

  async doRegisterUser(user: IUserWithRegistration, schoolId: string, inviteCodeId: string | undefined) {
    return Promise.all([
      this.usersRepo.assignSchool(user),
      this.schoolsRepo.consumeLicense(schoolId, this.getRole(user), +1),
      inviteCodeId ? this.inviteCodesRepo.incrementConsumedCount(inviteCodeId) : Promise.resolve()
    ]);
  }

  async doEnrollCourses(user: IUserWithRegistration, sections: string[], courses?: any[]) {
    const providerId = user.registration.provider;
    const role = this.getRole(user);
    if (role === Role.student) {
      if (providerId !== 'curio') {
        const dbSections = await this.sectionsRepo.findMany({ _id: { $in: sections } });
        if (dbSections.length !== sections.length) {
          this.validateProvider(providerId, 'Section');
          const newSections: string[] = getNotMatchingObjects(dbSections, sections);
          await this.createSections(newSections, user);
        }
      }
      await this.sectionsRepo.addStudents({ _id: { $in: sections } }, [user._id]);
    }
    if (!courses || (courses && courses.length > 0 && providerId !== 'curio')) {
      const activeCourses = await this.coursesRepo.getActiveCoursesUnderSections(sections);
      if (courses) {
        this.validateProvider(providerId, 'Course');
        const coursesToAdd = courses.filter(c => !activeCourses.some(a => a.grade === c.grade && a.subject === c.subject));
        await this.coursesRepo.addMany(coursesToAdd);
        courses = courses.map(c => c._id);
      } else {
        courses = activeCourses.map(c => c._id);
      }
    }
    const now = new Date();
    await this.coursesRepo.addUsersToCourses([{
      filter: { _id: { $in: courses } },
      usersObjs: [{ _id: user._id, joinDate: now, isEnabled: true }]
    }], role);
  }

  private async createSchool(school: { _id: string; name: string; }, provider: IProvider): Promise<ISchool> {
    const dbSchool: ISchool = {
      _id: newSchoolId(school.name),
      locales: { en: { name: school.name } },
      provider: { _id: provider._id, links: [school._id] },
      academicTerms: provider.academicTerms || [],
      location: provider.location,
      license: provider.license,
      users: []
    };
    await this.schoolsRepo.add(dbSchool);
    return dbSchool;
  }

  private async createSections(sectionsIds: string[], user: IUserWithRegistration) {
    const dbSections = sectionsIds.map(sectionId => {
      const { name } = user.registration.sections!.find(s => s._id === sectionId) || { name: sectionId };
      const section: ISection = {
        _id: '',
        locales: { en: { name } },
        schoolId: user.school!._id,
        grade: user.registration.grade,
        students: [user._id],
        providerLinks: [sectionId]
      };
      section._id = newSectionId(section.schoolId, section.grade, section.locales);
      return section;
    });
    return this.sectionsRepo.addMany(dbSections);
  }

  private getRole(user: IUser): Role {
    return user.role.includes(Role.teacher) ? Role.teacher : Role.student;
  }

  private async validateProvider(providerId: string, entity: 'School' | 'Section' | 'Course') {
    if (!this.provider) {
      this.provider = await this.providersRepo.findById(providerId);
      if (!this.provider) throw new NotFoundError('Requested provider was not found!');
    }
    if (!this.provider.config[`autoCreate${entity}`]) {
      throw new InvalidRequestError(`Provider is not configured to auto create ${entity}!`);
    }
  }

  async update(request: { user_id: string, new_user_data: Partial<IUserData> }) {
    const user = request.new_user_data;
    const userObj: Partial<IUser> = {};
    if (user.role) userObj.role = user.role;
    if (user.name || user.avatar) {
      userObj.profile = <IProfile>{};
      if (user.name) userObj.profile.name = user.name;
      if (user.avatar) userObj.profile.avatar = user.avatar;
    }
    if (Object.keys(userObj).length > 0) {
      await this.usersRepo.patch({ _id: request.user_id }, userObj);
      return this._uow.commit();
    }
  }

  private transformToUser(request: ISignupRequest): IUserWithRegistration {
    const { user_id, new_user_data: data, provider } = request;
    return {
      _id: user_id,
      role: data.role,
      profile: {
        name: data.name,
        avatar: data.avatar
      },
      registration: {
        grade: data.grade,
        curriculum: data.curriculum,
        status: Status.inactive,
        school: data.inviteCode ? undefined : data.school && {
          _id: data.school.uuid,
          name: data.school.name
        },
        sections: data.inviteCode ? undefined : data.section && data.section.map(section => ({
          _id: section.uuid,
          name: section.name
        })),
        provider: provider || 'curio',
        inviteCode: data.inviteCode
      }
    };
  }
}