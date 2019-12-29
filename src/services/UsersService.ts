import validators from '../utils/validators';
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
import { ProvidersRepository } from '../repositories/ProvidersRepository';
import { IProvider } from '../models/entities/IProvider';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';
import { ISchool } from '../models/entities/ISchool';
import { newSchoolId, newSectionId } from '../utils/IdGenerator';
import { getNotMatchingObjects } from '../utils/validators/AllObjectsExist';
import { ISection } from '../models/entities/ISection';
import { ICourse, IUserCourseInfo } from '../models/entities/ICourse';
import { KafkaService } from './KafkaService';
import config from '../config';
import { Events } from './UpdatesProcessor';
import { Repo } from '../repositories/RepoNames';
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
    await this.register(user);
  }

  private async register(user: IUserWithRegistration) {
    const { registration } = user;
    let schoolId = registration.school && registration.school._id;
    let inviteCode: IInviteCode | undefined;

    if (registration.inviteCode) {
      inviteCode = await this.getInviteCode(registration.inviteCode);
      if (inviteCode) schoolId = inviteCode.schoolId;
      else inviteCode = <IInviteCode>{ isEnabled: false };
      registration.provider = 'curio';
    }

    let dbSchool: ISchool | undefined;
    if (schoolId) {
      if (registration.provider === 'curio') {
        dbSchool = await this.schoolsRepo.findById(schoolId);
      } else {
        dbSchool = await this.schoolsRepo.findOne({ 'provider.links': schoolId });
        if (!dbSchool && registration.school) {
          const provider = await this.validateAndGetProvider(registration.provider, 'School');
          dbSchool = await this.createSchool(registration.school, provider);
        }
      }
    }
    return this.completeRegisteration(user, dbSchool, inviteCode);
  }

  protected async completeRegisteration(user: IUserWithRegistration, dbSchool?: ISchool, inviteCode?: IInviteCode) {
    const { dbUser, sections, courses, enrollmentType } = new UserRegisteration(dbSchool, user, inviteCode);
    if (dbUser.school) {
      await this.doRegisterUser(dbUser, dbUser.school._id, inviteCode && inviteCode._id);
      let enrolledCourses: string[] = [];
      if (enrollmentType === EnrollmentType.auto) {
        enrolledCourses = await this.doEnrollCourses(dbUser, sections, user.registration.provider);
      } else if (enrollmentType === EnrollmentType.courses) {
        enrolledCourses = await this.doEnrollCourses(dbUser, sections, user.registration.provider, courses);
      }
      this.sendUpdate({
        _id: user._id,
        status: Status.active,
        schoolId: dbUser.school._id,
        courses: enrolledCourses
      });
    } else {
      await this.usersRepo.addRegisteration(dbUser);
      this.sendUpdate({
        _id: user._id,
        status: user.registration.status
      });
    }
    return this._uow.commit();
  }

  protected sendUpdate(data: any) {
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

  async doEnrollCourses(user: IUserWithRegistration, sections: string[], providerId: string, courses?: string[]) {
    const dbSections = await this.sectionsRepo.findMany({ _id: { $in: sections } });
    if (dbSections.length !== sections.length && providerId !== 'curio') {
      const newSections: string[] = getNotMatchingObjects(dbSections, sections);
      this.validateAndGetProvider(providerId, 'Section');
      await this.createSections(newSections, user);
    }
    await this.sectionsRepo.addStudents({ _id: { $in: sections } }, [user._id]);
    if (courses) {
      const dbCourses = await this.coursesRepo.findMany({ _id: { $in: courses } });
      if (dbCourses.length !== courses.length && providerId !== 'curio') {
        const newCourses: string[] = getNotMatchingObjects(dbCourses, courses);
        this.validateAndGetProvider(providerId, 'Course');
        await this.createCourses(newCourses, user);
      }
    } else {
      const activeCourses = await this.coursesRepo.getActiveCoursesUnderSections(sections);
      courses = activeCourses.map(course => course._id);
    }
    await this.coursesRepo.addUsersToCourses([{
      filter: { _id: { $in: courses } },
      usersObjs: [{ _id: user._id, joinDate: new Date(), isEnabled: true }]
    }], this.getRole(user));
    return courses;
  }

  private async createSchool(school: { _id: string; name: string; }, provider: IProvider): Promise<ISchool> {
    const dbSchool: ISchool = {
      _id: newSchoolId(school.name),
      locales: { en: { name: school.name } },
      provider: { _id: provider._id, links: [school._id] },
      academicTerms: provider.academicTerms || [],
      location: provider.location,
      users: []
    };
    await this.schoolsRepo.add(dbSchool);
    return dbSchool;
  }

  private async createSections(sectionsIds: string[], user: IUserWithRegistration) {
    const dbSections = sectionsIds.map(sectionId => {
      const section: ISection = {
        _id: '',
        locales: { en: { name: sectionId } },
        schoolId: user.school!._id,
        grade: user.registration.grade,
        students: [user._id],
        providerLinks: [sectionId]
      };
      section._id = newSectionId(section._id, section.grade, section.locales);
      return section;
    });
    return this.sectionsRepo.addMany(dbSections);
  }

  private async createCourses(coursesIds: string[], user: IUserWithRegistration) {
    const now = new Date();
    const school = await this.schoolsRepo.findById(user.school!._id);
    const academicTerm = school!.academicTerms.find(term => term.startDate < now && now < term.endDate);
    const { grade, curriculum, } = user.registration;
    const dbCourses = coursesIds.map(courseId => <ICourse>{
      _id: courseId,
      grade, curriculum,
      academicTerm,
      isEnabled: true,
      schoolId: user.school!._id,
      teachers: <IUserCourseInfo[]>[],
      students: [{ _id: user._id, joinDate: now, isEnabled: true }]
    });
    return this.coursesRepo.addMany(dbCourses);
  }

  private getRole(user: IUser): Role {
    return user.role.includes(Role.teacher) ? Role.teacher : Role.student;
  }

  private async getInviteCode(codeId: string) {
    return this.inviteCodesRepo.findById(codeId);
  }

  private async validateAndGetProvider(providerId: string, entity: 'School' | 'Section' | 'Course') {
    if (!this.provider) {
      this.provider = await this.providersRepo.findById(providerId);
      if (!this.provider) throw new InvalidRequestError('Requested provider was not found!');
    }
    if (!this.provider.config[`autoCreate${entity}`]) throw new InvalidRequestError(`Provider is not configured to auto create ${entity}!`);
    return this.provider;
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
        status: Status.pendingApproval,
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