import { IUnitOfWork } from '@saal-oryx/unit-of-work';
import { UsersRepository } from '../repositories/UsersRepository';
import { Status, IUserWithRegistration } from '../models/entities/IUser';
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
import { ISection } from '../models/entities/ISection';
import config from '../config';
import { Repo } from '../models/RepoNames';
import { IUserUpdatedData } from '../models/events/IUserUpdatedEvent';
import { NotFoundError } from '../exceptions/NotFoundError';
import { KafkaService, IKafkaEvent } from '@saal-oryx/event-sourcing';
import { Events } from './processors/UpdatesProcessor';
import { ICourse } from '../models/entities/ICourse';
import { Service } from '../models/ServiceName';
const logger = loggerFactory.getLogger('UsersService');

export class UsersService {

  private provider?: IProvider;
  private now: Date;
  private events: IKafkaEvent<any>[];

  constructor(protected _uow: IUnitOfWork, protected _kafkaService: KafkaService) {
    this.now = new Date();
    this.events = [];
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

  async signupOrUpdate(request: ISignupRequest) {
    const isProvider = request.provider !== 'curio';
    const user = this.transformToUser(request);
    const dbUser = await this.usersRepo.findById(user._id);

    // If provider user is updated: drop user from previous registration
    if (isProvider && dbUser && dbUser.school) {
      // To check if user's school is the same as the school mentioned in request
      const sameSchool = await this.schoolsRepo.findOne({ '_id': dbUser.school._id, 'provider.links': user.school!._id });
      const role = this.getRole(user);
      if (sameSchool) {
        const sections = (user.registration.sections || []).map(s => s._id);
        this.dropCoursesIfDifferentSections(user._id, role, sections);
      } else this.doWithdrawFromSchool(user._id, role, dbUser.school._id);
    }

    if (isProvider || !dbUser) {
      await this.register(user);
    }
    await this.usersRepo.patch({ _id: user._id }, { profile: user.profile });

    return this._uow.commit();
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
          this.addCommandsEvent(Service.schools, 'doAdd', dbSchool);
        }
      }
    }
    return this.completeRegisteration(user, dbSchool, inviteCode);
  }

  protected async completeRegisteration(user: IUserWithRegistration, dbSchool?: ISchool, inviteCode?: IInviteCode) {
    const { dbUser, sections, courses, status, enrollmentType } = new UserRegisteration(dbSchool, user, inviteCode);
    if (dbUser.school) {
      await this.doRegisterInSchool(dbUser, dbUser.school._id, inviteCode && inviteCode._id);
      if (enrollmentType === EnrollmentType.auto) {
        await this.doEnrollCourses(dbUser, sections);
      } else if (enrollmentType === EnrollmentType.courses) {
        await this.doEnrollCourses(dbUser, sections, courses);
      }
    } else {
      await this.usersRepo.addRegisteration(dbUser);
    }
    await this.sendUserEnrollmentUpdates(dbUser, status);
  }

  async doRegisterInSchool(user: IUserWithRegistration, schoolId: string, inviteCodeId: string | undefined) {
    const alreadyRegistered = await this.usersRepo.findOne({ '_id': user._id, 'school._id': schoolId });
    if (alreadyRegistered) return;
    await this.usersRepo.assignSchool(user);
    await this.schoolsRepo.consumeLicense(schoolId, this.getRole(user), +1);
    if (inviteCodeId) await this.inviteCodesRepo.incrementConsumedCount(inviteCodeId);
  }

  async doEnrollCourses(user: IUserWithRegistration, sections: string[], courses?: ICourse[] | string[]) {
    const providerId = user.registration.provider;
    const role = this.getRole(user);
    if (providerId !== 'curio') {
      const dbSections = await this.sectionsRepo.findMany({ providerLinks: { $in: sections } });
      let sectionsIds = dbSections.map(s => s._id);
      if (dbSections.length !== sections.length) {
        this.validateProvider(providerId, 'Section');
        const newSections = sections.filter(s => dbSections.every(x => !x.providerLinks.includes(s)));
        if (newSections.length > 0) {
          const newDbSections = await this.createSections(newSections, user);
          for (const section of newDbSections) this.addCommandsEvent(Service.sections, 'doCreate', section);
          sectionsIds = Array.from(new Set(sectionsIds.concat(newDbSections.map(s => s._id))));
        }
      }
      sections = sectionsIds;
    }
    if (role === Role.student) {
      await this.sectionsRepo.addStudents({ _id: { $in: sections } }, [user._id]);
    }
    if (!courses || (courses && courses.length > 0 && providerId !== 'curio')) {
      const activeCourses = await this.coursesRepo.getActiveCoursesUnderSections(sections);
      let coursesIds = activeCourses.map(c => c._id);
      if (courses && providerId !== 'curio') {
        this.validateProvider(providerId, 'Course');
        const newCourses = (<ICourse[]>courses).filter(c => !activeCourses.some(a => a.grade === c.grade && a.subject === c.subject));
        if (newCourses.length > 0) {
          const newDbCourses = await this.coursesRepo.addMany(newCourses);
          for (const course of newDbCourses) this.addCommandsEvent(Service.courses, 'doCreate', course);
          coursesIds = Array.from(new Set(coursesIds.concat(newDbCourses.map(s => s._id))));
        }
      }
      courses = coursesIds;
    }
    await this.coursesRepo.addUsersToCourses([{
      filter: { _id: { $in: courses } },
      usersObjs: [{ _id: user._id, joinDate: this.now, isEnabled: true }]
    }], role);
  }

  private async createSchool(school: { _id: string; name: string; }, provider: IProvider) {
    const dbSchool: ISchool = {
      _id: newSchoolId(school.name),
      locales: { en: { name: school.name } },
      provider: { _id: provider._id, links: [school._id] },
      academicTerms: provider.academicTerms || [],
      location: provider.location,
      license: provider.license,
      users: []
    };
    return this.schoolsRepo.add(dbSchool);
  }

  private async createSections(sectionsIds: string[], user: IUserWithRegistration) {
    const schoolId = user.school!._id;
    const dbSections = sectionsIds.map(sectionId => {
      const { name, grade } = user.registration.sections!.find(s => s._id === sectionId) || { name: sectionId, grade: '6' };
      const locales = { en: { name } };
      return {
        _id: newSectionId(schoolId, grade, locales),
        schoolId, grade, locales,
        students: [user._id],
        providerLinks: [sectionId]
      };
    });
    return this.sectionsRepo.addMany(dbSections, false);
  }

  private getRole(user: { role: string[] }): Role {
    if (user.role.includes(Role.teacher)) {
      return Role.teacher;
    }
    if (user.role.includes(Role.principal)) {
      return Role.teacher;
    }
    return Role.student;
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

  protected async dropCoursesIfDifferentSections(userId: string, role: Role, sectionsIds: string[]) {
    const currentSections = await this.sectionsRepo.findMany({ students: userId });
    const droppedSections = currentSections.filter(cs => !sectionsIds.find(id => cs.providerLinks.includes(id)));

    if (droppedSections.length > 0) {
      const sectionsIds = droppedSections.map(s => s._id);
      if (role === Role.student) await this.sectionsRepo.removeStudents({ _id: { $in: sectionsIds } }, [userId]);
      await this.coursesRepo.finishUsersInCourses([{ filter: { sectionId: { $in: sectionsIds } }, usersIds: [userId] }], role, this.now);
    }
  }

  protected async doWithdrawFromSchool(userId: string, role: Role, schoolId: string) {
    if (role === Role.student) await this.sectionsRepo.removeStudents({ schoolId }, [userId]);
    await this.coursesRepo.finishUsersInCourses([{ filter: { schoolId }, usersIds: [userId] }], role, this.now);
    await this.schoolsRepo.releaseLicense(schoolId, role, 1);
  }

  protected async sendUserEnrollmentUpdates(user: IUserWithRegistration, status: Status = Status.active) {
    const userCourses = await this.coursesRepo.getActiveCoursesForUsers(this.getRole(user), [user._id]);
    this._kafkaService.send(config.kafkaUpdatesTopic, {
      key: user._id,
      timestamp: this.now.getTime(),
      event: Events.enrollment,
      data: {
        _id: user._id, status,
        // tslint:disable-next-line: no-null-keyword
        schoolId: user.school ? user.school._id : null,
        courses: userCourses.map(course => ({
          _id: course._id,
          sectionId: course.sectionId,
          grade: course.grade,
          subject: course.subject,
          curriculum: course.curriculum
        }))
      },
      v: '1.0.0'
    });
  }

  protected async sendCommandsEvents() {
    return this._kafkaService.sendMany<IKafkaEvent<any>>(config.kafkaCommandsTopic, this.events);
  }

  protected addCommandsEvent(serviceName: string, proccessingFunction: string, args: any) {
    this.events.push({
      key: this._kafkaService.getNewKey(),
      event: `${proccessingFunction}_${serviceName}`,
      timestamp: this.now.getTime(),
      data: [args],
      v: '1.0.0',
    });
  }

  private transformToUser(request: ISignupRequest): IUserWithRegistration {
    const { user_id, new_user_data: data, provider } = request;
    let sections: { _id: string; name: string, grade: string }[] = [];
    if (data.section instanceof Array) {
      sections = data.section.map(section => ({
        _id: section.uuid,
        name: section.name,
        grade: section.grade
      }));
    }
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
        sections: data.inviteCode ? undefined : sections,
        provider: provider || 'curio',
        inviteCode: data.inviteCode
      }
    };
  }
}