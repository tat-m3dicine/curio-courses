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
import { ProvidersRepository } from '../repositories/ProvidersRepository';
import { IProvider } from '../models/entities/IProvider';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';
import { ISchool } from '../models/entities/ISchool';
import { newSchoolId, newSectionId } from '../utils/IdGenerator';
import { getNotMatchingObjects } from '../utils/validators/AllObjectsExist';
import { ISection } from '../models/entities/ISection';
import { ICourse, IUserCourseInfo } from '../models/entities/ICourse';
const logger = loggerFactory.getLogger('UserSchema');

export class UsersService {

  private provider?: IProvider;

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

  protected get providersRepo() {
    return this._uow.getRepository('Providers', true) as ProvidersRepository;
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

    let dbSchool: ISchool | undefined;
    if (registration.provider === 'curio') {
      dbSchool = await this.schoolsRepo.findById(schoolId);
    } else {
      dbSchool = await this.schoolsRepo.findOne({ 'provider.links': schoolId });
      if (!dbSchool && !inviteCode) {
        const provider = await this.validateAndGetProvider(registration.provider, 'School');
        dbSchool = await this.createSchool(registration.school, provider);
      }
    }

    const { dbUser, sections, courses, enrollmentType } = new UserRegisteration(dbSchool, user);
    if (dbUser.school) {
      await this.doRegisterUser(dbUser, inviteCode);
      if (enrollmentType === EnrollmentType.auto) {
        await this.doEnrollCourses(dbUser, sections, registration.provider);
      } else if (enrollmentType === EnrollmentType.courses) {
        await this.doEnrollCourses(dbUser, sections, registration.provider, courses);
      }
    } else {
      await this.usersRepo.addRegisteration(dbUser);
    }
    return this._uow.commit();
  }

  async doRegisterUser(user: IUser, inviteCode?: IInviteCode) {
    await this.usersRepo.assignSchool(user);
    if (user.school) {
      await this.schoolsRepo.consumeLicense(user.school._id, this.getRole(user), +1);
    }
    if (inviteCode) {
      await this.inviteCodesRepo.incrementConsumedCount(inviteCode._id);
    }
  }

  async doEnrollCourses(user: IUser, sections: string[], providerId: string, courses?: string[]) {
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

  private async createSections(sectionsIds: string[], user: IUser) {
    const dbSections = sectionsIds.map(sectionId => {
      const section = <ISection>{
        _id: '',
        locales: { en: { name: sectionId } },
        schoolId: user.school!._id,
        grade: user.registration!.grade,
        students: [user._id],
        providerLinks: [sectionId]
      };
      section._id = newSectionId(section._id, section.grade, section.locales);
      return section;
    });
    return this.sectionsRepo.addMany(dbSections);
  }

  private async createCourses(coursesIds: string[], user: IUser) {
    const now = new Date();
    const school = await this.schoolsRepo.findById(user.school!._id);
    const academicTerm = school!.academicTerms.find(term => term.startDate < now && now < term.endDate);
    const { grade, curriculum, } = user.registration!;
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
        curriculum: data.curriculum,
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