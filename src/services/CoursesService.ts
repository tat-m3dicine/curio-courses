
import config from '../config';
import validators from '../utils/validators';
import { IUnitOfWork, IPaging } from '@saal-oryx/unit-of-work';
// models
import { Role } from '../models/Role';
import { IUser, Status } from '../models/entities/IUser';
import { IUserToken } from '../models/IUserToken';
import { ISchool } from '../models/entities/ISchool';
import { IAcademicTerm } from '../models/entities/Common';
import { IUserRequest } from '../models/requests/IUserRequest';
import { ICourse, IUserCourseInfo } from '../models/entities/ICourse';
import { ICreateCourseRequest } from '../models/requests/ICourseRequests';
// exceptions
import { NotFoundError } from '../exceptions/NotFoundError';
import { ForbiddenError } from '../exceptions/ForbiddenError';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import { InvalidLicenseError } from '../exceptions/InvalidLicenseError';
// repositories
import { UsersRepository } from '../repositories/UsersRepository';
import { CoursesRepository } from '../repositories/CoursesRepository';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import { SectionsRepository } from '../repositories/SectionsRepository';
// Utils
import { validateAllObjectsExist } from '../utils/validators/AllObjectsExist';
import { IUserUpdatedEvent, IUserCourseUpdates } from '../models/events/IUserUpdatedEvent';
import { newCourseId } from '../utils/IdGenerator';
import { Repo } from '../models/RepoNames';
import { CommandsProcessor } from '@saal-oryx/event-sourcing';
import { UpdatesProcessor, Events } from './processors/UpdatesProcessor';
import { Service } from '../models/ServiceName';
import loggerFactory from '../utils/logging';
import { InviteCodesRepository } from '../repositories/InviteCodesRepository';
import { IInviteCodeForCourse } from '../models/entities/IInviteCode';

const logger = loggerFactory.getLogger('CoursesService');

export class CoursesService {
  constructor(
    protected _uow: IUnitOfWork,
    protected _commandsProcessor: CommandsProcessor,
    protected _updatesProcessor: UpdatesProcessor
  ) { }

  protected get schoolsRepo() {
    return this._uow.getRepository(Repo.schools) as SchoolsRepository;
  }

  protected get sectionsRepo() {
    return this._uow.getRepository(Repo.sections) as SectionsRepository;
  }

  protected get usersRepo() {
    return this._uow.getRepository(Repo.users) as UsersRepository;
  }

  protected get coursesRepo() {
    return this._uow.getRepository(Repo.courses) as CoursesRepository;
  }

  protected get inviteCodesRepo() {
    return this._uow.getRepository(Repo.inviteCodes) as InviteCodesRepository;
  }

  async create(course: ICreateCourseRequest, byUser: IUserToken) {
    this.authorize(byUser);
    validators.validateCreateCourse(course);
    const school: ISchool = await this.validateAndGetSchool(course);
    const { schoolId, sectionId, curriculum, grade, subject, academicTermId, teachers = [], students = [] } = course;
    const academicTerm: IAcademicTerm = this.validateAndGetAcademicTerm(school, academicTermId);

    const usersIds = [...teachers, ...students];
    const studentsObjs: IUserCourseInfo[] = [], teachersObjs: IUserCourseInfo[] = [];
    if (usersIds.length > 0) {
      const now = new Date();
      const users: IUser[] = await this.usersRepo.getUsersInSchool(schoolId, usersIds);
      const usersMap: { [_id: string]: IUser } = users.reduce((map, user) => ({ ...map, [user._id]: user }), {});

      students.forEach(_id => {
        const student = usersMap[_id];
        if (student && student.role.includes(Role.student)) {
          studentsObjs.push({ _id: student._id, joinDate: now, isEnabled: true });
        }
      });
      validateAllObjectsExist(studentsObjs, students, schoolId, Role.student);

      teachers.forEach(_id => {
        const teacher = usersMap[_id];
        if (teacher && teacher.role.includes(Role.teacher)) {
          teachersObjs.push({ _id: teacher._id, joinDate: now, isEnabled: true });
        }
      });
      validateAllObjectsExist(teachersObjs, teachers, schoolId, Role.teacher);
    }

    return this._commandsProcessor.sendCommand(Service.courses, this.doCreate, <ICourse>{
      _id: newCourseId(sectionId, subject, academicTerm.year),
      schoolId, sectionId, curriculum, grade, subject, academicTerm,
      defaultLocale: course.defaultLocale || Object.keys(course.locales)[0] || 'en',
      isEnabled: course.isEnabled === undefined ? true : course.isEnabled,
      locales: course.locales,
      teachers: teachersObjs,
      students: studentsObjs
    });
  }

  private async doCreate(course: ICourse) {
    const partialRequest = {
      courseId: course._id,
      schoolId: course.schoolId,
      sectionId: course.sectionId
    };
    let addedCourse: ICourse;
    try {
      const coursesRepoWithTransactions = this._uow.getRepository(Repo.courses, true) as CoursesRepository;
      addedCourse = await coursesRepoWithTransactions.add(course);
      await this._uow.commit();
    } catch (err) {
      if (err && err.code === 11000) { // Duplicate error
        addedCourse = course;
      }
      throw err;
    }
    await this.sendUsersChangesUpdates('enroll', [{
      ...partialRequest,
      role: Role.student,
      usersIds: course.students.map(s => s._id)
    }, {
      ...partialRequest,
      role: Role.teacher,
      usersIds: course.teachers.map(s => s._id)
    }]);
    this._updatesProcessor.notifyCourseEvents(Events.course_created, { ...addedCourse, students: undefined, teachers: undefined });
    return addedCourse;
  }

  async listWithSections(schoolId: string, byUser: IUserToken) {
    this.authorize(byUser, schoolId);
    const sections = await this.sectionsRepo.findMany({ schoolId }, { students: 0 });
    const courses = await this.coursesRepo.getActiveCoursesForSchool(schoolId, { students: 0, teachers: 0 });
    return { sections, courses };
  }

  async list(schoolId: string, sectionId: string, paging: IPaging, byUser: IUserToken) {
    this.authorize(byUser);
    return this.coursesRepo.findManyPage({ schoolId, sectionId }, paging);
  }

  async getById(schoolId: string, courseId: string, includeProfiles: boolean, byUser: IUserToken) {
    this.authorize(byUser, schoolId);
    return this.coursesRepo.getById(schoolId, courseId, includeProfiles);
  }

  async get(schoolId: string, sectionId: string, courseId: string, byUser: IUserToken) {
    this.authorize(byUser);
    return this.coursesRepo.findOne({ _id: courseId, sectionId, schoolId });
  }

  async update(schoolId: string, sectionId: string, courseId: string, updateObj: Partial<ICourse>, byUser: IUserToken) {
    this.authorize(byUser);
    validators.validateUpdateCourse(updateObj);
    return this._commandsProcessor.sendCommand(Service.courses, this.doUpdate, { _id: courseId, sectionId, schoolId }, updateObj);
  }

  private async doUpdate(filter: object, updateObj: Partial<ICourse>) {
    const coursesRepoWithTransactions = this._uow.getRepository(Repo.courses, true) as CoursesRepository;
    const result = await coursesRepoWithTransactions.patch(filter, updateObj);
    const updatedCourse = await coursesRepoWithTransactions.findOne(filter);
    await this._updatesProcessor.notifyCourseEvents(Events.course_updated, { ...updatedCourse, students: undefined, teachers: undefined });
    await this._uow.commit();
    return result;
  }

  async delete(schoolId: string, sectionId: string, courseId: string, byUser: IUserToken) {
    this.authorize(byUser);
    const course = await this.coursesRepo.findOne({ _id: courseId, sectionId, schoolId });
    if (!course) throw new NotFoundError(`Couldn't find course '${courseId}' in section '${sectionId}'`);
    return this._commandsProcessor.sendCommand(Service.courses, this.doDelete, courseId);
  }

  private async doDelete(courseId: string) {
    const coursesRepoWithTransactions = this._uow.getRepository(Repo.courses, true) as CoursesRepository;
    const result = await coursesRepoWithTransactions.delete({ _id: courseId });
    await this._updatesProcessor.notifyCourseEvents(Events.course_deleted, { _id: courseId });
    await this._uow.commit();
    return result;
  }

  async enableStudent(requestParam: IUserRequest, byUser: IUserToken) {
    return this.toggleUsers(requestParam, Role.student, true, byUser);
  }

  async disableStudent(requestParam: IUserRequest, byUser: IUserToken) {
    return this.toggleUsers(requestParam, Role.student, false, byUser);
  }

  private async toggleUsers(requestParam: IUserRequest, role: Role, value: boolean, byUser: IUserToken) {
    this.authorize(byUser);
    await this.validateCoursesAndUsers([requestParam], role);
    return this._commandsProcessor.sendCommand(Service.courses, this.doToggleStudents, requestParam, role, value);
  }

  private async doToggleStudents({ schoolId, sectionId, courseId, usersIds }: IUserRequest, role: Role, value: boolean) {
    return this.coursesRepo.toggleUsersInCourses({ _id: courseId, schoolId, sectionId }, usersIds, role, value);
  }

  async enrollStudents(requestParam: IUserRequest, byUser: IUserToken) {
    return this.enrollUsers([requestParam], Role.student, byUser);
  }

  async enrollStudentsInCourses(requestParams: IUserRequest[], byUser: IUserToken, sameSection = true) {
    return this.enrollUsers(requestParams, Role.student, byUser, sameSection);
  }

  async enrollTeachers(requestParam: IUserRequest, byUser: IUserToken) {
    return this.enrollUsers([requestParam], Role.teacher, byUser);
  }

  async enrollTeachersInCourses(requestParams: IUserRequest[], byUser: IUserToken, sameSection = true) {
    return this.enrollUsers(requestParams, Role.teacher, byUser, sameSection);
  }

  async dropStudents(requestParam: IUserRequest, byUser: IUserToken) {
    return this.dropUsers([requestParam], Role.student, byUser);
  }

  async dropStudentsInCourses(requestParams: IUserRequest[], byUser: IUserToken) {
    return this.dropUsers(requestParams, Role.student, byUser);
  }

  async dropTeachers(requestParam: IUserRequest, byUser: IUserToken) {
    return this.dropUsers([requestParam], Role.teacher, byUser);
  }

  async dropTeachersInCourses(requestParams: IUserRequest[], byUser: IUserToken) {
    return this.dropUsers(requestParams, Role.teacher, byUser);
  }

  async getActiveCourses(userId: string, role?: Role) {
    if (!role) return { courses: [], sections: [] };
    const courses = await this.coursesRepo.getActiveCoursesForUser(role, userId);
    if (role === Role.student) {
      return {
        courses: courses.map(c => ({ ...c, students: undefined, teachers: undefined }))
      };
    }
    const userIds = courses.reduce((list, c) =>
      list.concat([...c.students, ...c.teachers].map(u => u._id)), <string[]>[]
    );
    const users = await this.usersRepo.findMany({ _id: { $in: Array.from(new Set(userIds)) } });
    const sections = await this.sectionsRepo.findMany({ _id: { $in: courses.map(c => c.sectionId) } });
    const inviteCodes = await this.inviteCodesRepo.findForCourses(courses.map(c => c._id));

    return {
      courses: courses.map(course => ({ ...course, students: course.students.map(s => s._id), teachers: course.teachers.map(teacher => teacher._id) })),
      students: users.filter(student => student.role.includes(Role.student)).map(student => ({ _id: student._id, profile: student.profile })),
      teachers: users.filter(teacher => teacher.role.includes(Role.teacher)).map(teacher => ({ _id: teacher._id, profile: teacher.profile })),
      sections: sections.map(section => ({ _id: section._id, locales: section.locales })),
      invite_codes: inviteCodes.map(({ validity, quota, _id, enrollment }) => <IInviteCodeForCourse>{ validity, quota, _id, courseId: enrollment.courses![0] })
    };
  }

  public async notifyForUserEnrollment(role: Role, userIds: string[]) {
    const users: IUser[] = await this.usersRepo.findMany({ _id: { $in: userIds }, role });
    const courses: ICourse[] = await this.coursesRepo.getActiveCoursesForUsers(role, userIds);
    const coursesUpdates = this.transformCoursesToUpdates(courses, role);
    const events = users.map(user => ({
      _id: user._id,
      // tslint:disable-next-line: no-null-keyword
      schoolId: user.school ? user.school._id : null,
      status: user.registration ? user.registration.status : (user.school ? Status.active : Status.inactive),
      courses: coursesUpdates[user._id]
    }));
    this._updatesProcessor.sendEnrollmentUpdates(events);
  }

  async repairUsers(role: Role, userIds: string[], byUser: IUserToken) {
    this.authorize(byUser);
    return this.notifyForUserEnrollment(role, userIds);
  }

  private async enrollUsers(requestParams: IUserRequest[], role: Role, byUser: IUserToken, sameSection = true) {
    this.authorize(byUser, role === Role.teacher ? requestParams[0].schoolId : undefined);
    const joinDate = new Date();
    await this.validateCoursesAndUsers(requestParams, role, sameSection);
    return this._commandsProcessor.sendCommand(Service.courses, this.doEnrollUsers, requestParams, role, joinDate);
  }

  private async doEnrollUsers(requests: IUserRequest[], role: Role, joinDate: Date) {
    const coursesUpdates: any[] = [], sectionsUpdates: any[] = [];
    for (const request of requests) {
      const { schoolId, sectionId, courseId, usersIds } = request;
      coursesUpdates.push({
        filter: { _id: courseId, schoolId, sectionId },
        usersObjs: usersIds.map(_id => <IUserCourseInfo>{ _id, joinDate, isEnabled: true })
      });
      sectionsUpdates.push({ filter: { _id: sectionId, schoolId }, usersIds });
    }

    const coursesRepoWithTransactions = this._uow.getRepository(Repo.courses, true) as CoursesRepository;
    const sectionsRepoWithTransactions = this._uow.getRepository(Repo.sections, true) as SectionsRepository;

    const result = await coursesRepoWithTransactions.addUsersToCourses(coursesUpdates, role);
    if (role === Role.student) await sectionsRepoWithTransactions.addStudentsToSections(sectionsUpdates);

    await this._uow.commit();
    if (result.modifiedCount !== 0) await this.sendUsersChangesUpdates('enroll', requests);
    return result;
  }

  private async dropUsers(requestParams: IUserRequest[], role: Role, byUser: IUserToken) {
    this.authorize(byUser, role === Role.teacher ? requestParams[0].schoolId : undefined);
    const finishDate = new Date();
    await this.validateCoursesAndUsers(requestParams, role);
    return this._commandsProcessor.sendCommand(Service.courses, this.doDropUsers, requestParams, role, finishDate);
  }

  private async doDropUsers(requests: IUserRequest[], role: Role, finishDate: Date) {
    const coursesUpdates: any[] = [];
    for (const request of requests) {
      const { schoolId, sectionId, courseId, usersIds } = request;
      coursesUpdates.push({ filter: { _id: courseId, schoolId, sectionId }, usersIds });
    }
    const result = await this.coursesRepo.finishUsersInCourses(coursesUpdates, role, finishDate);
    if (result.modifiedCount !== 0) await this.sendUsersChangesUpdates('drop', requests);
    return result;
  }

  private async sendUsersChangesUpdates(action: 'enroll' | 'drop', requests: IUserRequest[]) {
    logger.debug(`Sending user changes for action: ${action} with request`, requests);
    const coursesIds = requests.map(request => request.courseId);
    const events: IUserUpdatedEvent[] = [];
    for (const request of requests) {
      const usersIds = Array.from(new Set(request.usersIds));
      const users: IUser[] = await this.usersRepo.getUsersInSchool(request.schoolId, request.usersIds);
      const courses: ICourse[] = await this.coursesRepo.getActiveCoursesForUsers(request.role, usersIds);
      if (courses.length === 0) return;
      const coursesUpdates = this.transformCoursesToUpdates(courses, request.role);
      events.push(...users.map(user => <IUserUpdatedEvent>{
        event: action,
        data: {
          _id: user._id,
          // tslint:disable-next-line: no-null-keyword
          schoolId: user.school ? user.school._id : null,
          status: user.registration ? user.registration.status : (user.school ? Status.active : Status.inactive),
          courses: coursesUpdates[user._id]
        }
      }));
    }
    return this._updatesProcessor.sendEnrollmentUpdatesWithActions(events, coursesIds);
  }

  private transformCoursesToUpdates(courses: ICourse[], role: Role): { [_id: string]: IUserCourseUpdates[] } {
    const userCoursesUpdates = {};
    for (const course of courses) {
      for (const user of course[`${role}s`] as IUserCourseInfo[]) {
        const courseUpdates: IUserCourseUpdates = {
          _id: course._id,
          sectionId: course.sectionId,
          grade: course.grade,
          subject: course.subject,
          curriculum: course.curriculum
        };
        if (user._id in userCoursesUpdates) {
          userCoursesUpdates[user._id].push(courseUpdates);
        } else {
          userCoursesUpdates[user._id] = [courseUpdates];
        }
      }
    }
    return userCoursesUpdates;
  }

  private validateAndGetAcademicTerm(school: ISchool, academicTermId: string | undefined): IAcademicTerm {
    const now = new Date();
    if (academicTermId) {
      const academicTerm = school.academicTerms.find(term => term._id === academicTermId);
      if (!academicTerm) throw new InvalidLicenseError(`'${academicTermId}' academic term was not found in '${school._id}' school's registered terms!`);
      if (academicTerm.endDate < now) throw new InvalidLicenseError(`'${academicTermId}' academic term has already ended!`);
      return academicTerm;
    } else {
      const academicTerm = school.academicTerms.find(term => term.startDate < now && now < term.endDate);
      if (!academicTerm) throw new InvalidLicenseError(`No active academic term was found in '${school._id}' school!`);
      return academicTerm;
    }
  }

  private async validateAndGetSchool({ schoolId, sectionId, curriculum, grade, subject }: ICreateCourseRequest) {
    const school = await this.schoolsRepo.findById(schoolId);
    if (!school) throw new NotFoundError(`'${schoolId}' school was not found!`);
    const section = await this.sectionsRepo.findOne({ _id: sectionId, schoolId });
    if (!section) throw new NotFoundError(`'${sectionId}' section was not found in '${schoolId}' school!`);
    if (!school.license || !school.license.package) throw new InvalidLicenseError(`'${schoolId}' school doesn't have a vaild license!`);
    const gradePackage = school.license.package.grades[grade];
    if (!gradePackage || !gradePackage[subject] || !(gradePackage[subject] instanceof Array) || !gradePackage[subject].includes(curriculum)) {
      throw new InvalidLicenseError(`Grade '${grade}', subject '${subject}', curriculum '${curriculum}' aren't included in '${schoolId}' school's license package!`);
    }
    return school;
  }

  private async validateCoursesAndUsers(requestParams: IUserRequest[], role: Role, sameSection = true) {
    const { schoolId, sectionId } = requestParams[0];
    const courseIds: string[] = requestParams.map(request => request.courseId);
    const coursesObjs: ICourse[] = await this.coursesRepo.findMany({ _id: { $in: courseIds }, schoolId, ...(sameSection ? { sectionId } : {}) });
    validateAllObjectsExist(coursesObjs, courseIds, schoolId, 'course');
    const userIds: string[] = Array.from(new Set<string>(requestParams.reduce((list, params) => [...list, ...params.usersIds], <any>[])));
    const usersObjs: IUser[] = await this.usersRepo.findMany({ '_id': { $in: userIds }, 'school._id': schoolId, role });
    validateAllObjectsExist(usersObjs, userIds, schoolId, role);
  }

  protected authorize(byUser: IUserToken, schoolId?: string) {
    if (!byUser) throw new ForbiddenError('access token is required!');
    if (schoolId && byUser.schooluuid === schoolId && byUser.role.includes(Role.teacher)) {
      return true;
    } else if (byUser.role.includes(config.authorizedRole)) {
      return true;
    }
    throw new UnauthorizedError('you are not authorized to do this action');
  }
}