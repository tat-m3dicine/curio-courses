
import config from '../config';
import validators from '../utils/validators';
import generate from 'nanoid/non-secure/generate';
import { CommandsProcessor } from './CommandsProcessor';
import { IUnitOfWork, IPaging } from '@saal-oryx/unit-of-work';
//models
import { Role } from '../models/Role';
import { IUser } from '../models/entities/IUser';
import { IUserToken } from '../models/IUserToken';
import { ISchool } from '../models/entities/ISchool';
import { IAcademicTerm } from '../models/entities/Common';
import { IUserRequest } from '../models/requests/IUserRequest';
import { ICourse, IUserCourseInfo } from '../models/entities/ICourse';
import { ICreateCourseRequest } from '../models/requests/ICourseRequests';
//exceptions
import { NotFoundError } from '../exceptions/NotFoundError';
import { ForbiddenError } from '../exceptions/ForbiddenError';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import { InvalidLicenseError } from '../exceptions/InvalidLicenseError';
//repositories
import { UsersRepository } from '../repositories/UsersRepository';
import { CoursesRepository } from '../repositories/CoursesRepository';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import { SectionsRepository } from '../repositories/SectionsRepository';
import { validateAllObjectsExist } from '../utils/validators/AllObjectsExist';

export class CoursesService {

  constructor(protected _uow: IUnitOfWork, protected _commandsProcessor: CommandsProcessor) {
  }

  protected get schoolsRepo() {
    return this._uow.getRepository('Schools') as SchoolsRepository;
  }

  protected get sectionsRepo() {
    return this._uow.getRepository('Sections') as SectionsRepository;
  }

  protected get usersRepo() {
    return this._uow.getRepository('Users') as UsersRepository;
  }

  protected get coursesRepo() {
    return this._uow.getRepository('Courses') as CoursesRepository;
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
      const users: IUser[] = await this.usersRepo.findMany({ '_id': { $in: usersIds }, 'registration.schoolId': schoolId });
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

    return this._commandsProcessor.sendCommand('courses', this.doCreate, <ICourse>{
      _id: this.newCourseId(course),
      schoolId, sectionId, curriculum, grade, subject, academicTerm,
      defaultLocale: course.defaultLocale || Object.keys(course.locales)[0] || 'en',
      isEnabled: course.isEnabled === undefined ? true : course.isEnabled,
      locales: course.locales,
      teachers: teachersObjs,
      students: studentsObjs
    });
  }

  private async doCreate(course: ICourse) {
    return this.coursesRepo.add(course);
  }

  async list(schoolId: string, sectionId: string, paging: IPaging, byUser: IUserToken) {
    this.authorize(byUser);
    return this.coursesRepo.findManyPage({ schoolId, sectionId }, paging);
  }

  async get(schoolId: string, sectionId: string, courseId: string, byUser: IUserToken) {
    this.authorize(byUser);
    return this.coursesRepo.findOne({ _id: courseId, sectionId, schoolId });
  }

  async update(schoolId: string, sectionId: string, courseId: string, updateObj: Partial<ICourse>, byUser: IUserToken) {
    this.authorize(byUser);
    validators.validateUpdateCourse(updateObj);
    return this._commandsProcessor.sendCommand('courses', this.doUpdate, { _id: courseId, sectionId, schoolId }, updateObj);
  }

  private async doUpdate(filter: object, updateObj: Partial<ICourse>) {
    return this.coursesRepo.patch(filter, updateObj);
  }

  async delete(schoolId: string, sectionId: string, courseId: string, byUser: IUserToken) {
    this.authorize(byUser);
    const course = await this.coursesRepo.findOne({ _id: courseId, sectionId, schoolId });
    if (!course) throw new NotFoundError(`Couldn't find course '${courseId}' in section '${sectionId}'`);
    return this._commandsProcessor.sendCommand('courses', this.doDelete, courseId);
  }

  private async doDelete(courseId: string) {
    return this.coursesRepo.delete({ _id: courseId });
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

  private async enrollUsers(requestParams: IUserRequest[], role: Role, byUser: IUserToken, sameSection = true) {
    this.authorize(byUser);
    await this.validateCoursesAndUsers(requestParams, role, sameSection);
    const joinDate = new Date();
    if (requestParams.length === 1) {
      const users: IUserCourseInfo[] = requestParams[0].userIds.map(_id => ({ _id, joinDate, isEnabled: true }));
      return this._commandsProcessor.sendCommand('courses', this.doEnrollUsers, requestParams[0], role, users);
    } else {
      const commands = requestParams.map(request => {
        const users: IUserCourseInfo[] = request.userIds.map(_id => ({ _id, joinDate, isEnabled: true }));
        return [request, role, users];
      });
      this._commandsProcessor.sendManyCommandsAsync('courses', this.doEnrollUsers, commands);
      return { done: false, data: 'Processing...' };
    }
  }

  private async doEnrollUsers({ schoolId, sectionId, courseId }: IUserRequest, role: Role, usersObjs: IUserCourseInfo[]) {
    const sectionsRepoWithTransactions = this._uow.getRepository('Sections', true) as SectionsRepository;
    const coursesRepoWithTransactions = this._uow.getRepository('Courses', true) as CoursesRepository;

    const studentIds = usersObjs.map(user => user._id);
    sectionsRepoWithTransactions.update({ _id: sectionId, schoolId }, { $addToSet: { students: { $each: studentIds } } });

    const result = coursesRepoWithTransactions.addUsersToCourses({ _id: courseId, schoolId, sectionId }, `${role}s`, usersObjs);
    await this._uow.commit();
    return result;
  }

  async dropStudents(requestParam: IUserRequest, byUser: IUserToken) {
    return this.dropUsers([requestParam], Role.student, byUser);
  }

  async dropStudentsInCourses(requestParams: IUserRequest[], byUser: IUserToken) {
    return this.dropUsers(requestParams, Role.student, byUser);
  }

  async dropTeachers(requestParam: IUserRequest, byUser: IUserToken) {
    return this.dropUsers([requestParam], Role.student, byUser);
  }

  async dropTeachersInCourses(requestParams: IUserRequest[], byUser: IUserToken) {
    return this.dropUsers(requestParams, Role.teacher, byUser);
  }

  private async dropUsers(requestParams: IUserRequest[], role: Role, byUser: IUserToken) {
    this.authorize(byUser);
    await this.validateCoursesAndUsers(requestParams, role);
    const finishDate = new Date();
    if (requestParams.length === 1) {
      return this._commandsProcessor.sendCommand('courses', this.doDropUsers, requestParams[0], role, finishDate);
    } else {
      const commands = requestParams.map(request => [request, role, finishDate]);
      await this._commandsProcessor.sendManyCommandsAsync('courses', this.doDropUsers, commands);
      return { done: false, data: 'Processing...' };
    }
  }

  private async doDropUsers({ schoolId, sectionId, courseId, userIds }: IUserRequest, role: Role, finishDate: Date) {
    return this.coursesRepo.finishUsersInCourses({ _id: courseId, schoolId, sectionId }, `${role}s`, userIds, finishDate);
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
    const gradePackage = school.license.package[grade];
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
    const userIds: string[] = Array.from(new Set<string>(requestParams.reduce((list, params) => [...list, ...params.userIds], <any>[])));
    const usersObjs: IUser[] = await this.usersRepo.findMany({ '_id': { $in: userIds }, 'registration.schoolId': schoolId, role });
    validateAllObjectsExist(usersObjs, userIds, schoolId, role);
  }

  protected authorize(byUser: IUserToken) {
    if (!byUser) throw new ForbiddenError('access token is required!');
    const isAuthorized = byUser.role.split(',').includes(config.authorizedRole);
    if (!isAuthorized) throw new UnauthorizedError('you are not authorized!');
  }

  protected newCourseId({ schoolId, sectionId, subject, curriculum }: ICreateCourseRequest) {
    return `${subject}_${curriculum}_${sectionId}_${schoolId}}`.toLocaleLowerCase().replace(/\s/g, '');
  }
}