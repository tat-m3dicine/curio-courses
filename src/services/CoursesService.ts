import { IUnitOfWork, IPaging } from '@saal-oryx/unit-of-work';
import validators from '../utils/validators';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import config from '../config';
import { IUserToken } from '../models/IUserToken';
import generate = require('nanoid/non-secure/generate');
import { ICreateCourseRequest } from '../models/requests/ICourseRequests';
import { NotFoundError } from '../exceptions/NotFoundError';
import { ICourse, IUserCourseInfo } from '../models/entities/ICourse';
import { IUser, IAcademicTerm } from '../models/entities/Common';
import { UsersRepository } from '../repositories/UsersRepository';
import { CoursesRepository } from '../repositories/CoursesRepository';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import { InvalidLicenseError } from '../exceptions/InvalidLicenseError';
import { ForbiddenError } from '../exceptions/ForbiddenError';
import { CommandsProcessor } from './CommandsProcessor';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';
import { Role } from '../models/Role';
import { IUserRequest } from '../models/requests/IUserRequest';
import { SectionsRepository } from '../repositories/SectionsRepository';

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
    const { schoolId, sectionId, curriculum, grade, subject, academicTermId, teachers = [], students = [] } = course;
    const school = await this.schoolsRepo.findById(schoolId);
    if (!school) throw new NotFoundError(`'${schoolId}' school was not found!`);
    const section = await this.sectionsRepo.findOne({ _id: sectionId, schoolId });
    if (!section) throw new NotFoundError(`'${sectionId}' section was not found in '${schoolId}' school!`);
    if (!school.license || !school.license.package) throw new InvalidLicenseError(`'${schoolId}' school doesn't have a vaild license!`);
    const gradePackage = school.license.package[grade];
    if (!gradePackage || !gradePackage[subject] || !(gradePackage[subject] instanceof Array) || !gradePackage[subject].includes(curriculum)) {
      throw new InvalidLicenseError(`Grade '${grade}', subject '${subject}', curriculum '${curriculum}' aren't included in '${schoolId}' school's license package!`);
    }

    const now = new Date();
    let academicTerm: IAcademicTerm | undefined;
    if (academicTermId) {
      academicTerm = school.academicTerms.find(term => term._id === academicTermId);
      if (!academicTerm) throw new InvalidLicenseError(`'${academicTermId}' academic term was not found in '${schoolId}' school's registered terms!`);
      if (academicTerm.endDate < now) throw new InvalidLicenseError(`'${academicTermId}' academic term has already ended!`);
    } else {
      academicTerm = school.academicTerms.find(term => term.startDate < now && now < term.endDate);
      if (!academicTerm) throw new InvalidLicenseError(`No active academic term was found in '${schoolId}' school!`);
    }

    const usersIds = [...teachers, ...students];
    const studentsObj: IUserCourseInfo[] = [], teachersObj: IUserCourseInfo[] = [];
    if (usersIds.length > 0) {
      const now = new Date();
      const users: IUser[] = await this.usersRepo.findMany({ '_id': { $in: usersIds }, 'registration.schoolId': schoolId });
      const usersMap: { [_id: string]: IUser } = users.reduce((map, user) => ({ ...map, [user._id]: user }), {});

      students.forEach(id => {
        const student = usersMap[id];
        if (student && student.role.includes(Role.student)) {
          studentsObj.push({ _id: student._id, joinDate: now, isEnabled: true });
        }
      });
      if (studentsObj.length !== students.length) throw new InvalidRequestError(`Some students aren't registered in school ${schoolId}!`);

      teachers.forEach(id => {
        const teacher = usersMap[id];
        if (teacher && teacher.role.includes(Role.teacher)) {
          teachersObj.push({ _id: teacher._id, joinDate: now, isEnabled: true });
        }
      });
      if (teachersObj.length !== teachers.length) throw new InvalidRequestError(`Some teachers aren't registered in school ${schoolId}!`);
    }

    return this._commandsProcessor.sendCommand('courses', this.doCreate, <ICourse>{
      _id: this.newSectionId(grade, sectionId),
      schoolId, sectionId, curriculum, grade, subject, academicTerm,
      defaultLocale: course.defaultLocale || Object.keys(course.locales)[0] || 'en',
      isEnabled: course.isEnabled === undefined ? true : course.isEnabled,
      locales: course.locales,
      teachers: teachersObj,
      students: studentsObj
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

  async enrollStudents(requestParams: IUserRequest, byUser: IUserToken) {
    return this.enrollUsers({ ...requestParams, role: Role.student }, byUser);
  }

  async enrollTeachers(requestParams: IUserRequest, byUser: IUserToken) {
    return this.enrollUsers({ ...requestParams, role: Role.teacher }, byUser);
  }

  private async enrollUsers(requestParams: IUserRequest, byUser: IUserToken) {
    this.authorize(byUser);
    const joinDate = new Date();
    const { schoolId, userIds, role } = requestParams;
    const usersObj: IUser[] = await this.usersRepo.findMany({ '_id': { $in: userIds }, 'registration.schoolId': schoolId, role });
    this.validateAllUsersExist(usersObj, userIds, schoolId, role);
    const users: IUserCourseInfo[] = usersObj.map(user => ({ _id: user._id, joinDate, isEnabled: true }));
    return this._commandsProcessor.sendCommand('courses', this.doEnrollUsers, requestParams, users);
  }

  private async doEnrollUsers({ schoolId, sectionId, courseId, role }: IUserRequest, usersObj: IUserCourseInfo[]) {
    return this.coursesRepo.addUsersToCourses({ _id: courseId, schoolId, sectionId }, `${role}s`, usersObj);
  }

  async dropStudents(requestParams: IUserRequest, byUser: IUserToken) {
    return this.dropUsers({ ...requestParams, role: Role.student }, byUser);
  }

  async dropTeachers(requestParams: IUserRequest, byUser: IUserToken) {
    return this.dropUsers({ ...requestParams, role: Role.teacher }, byUser);
  }

  private async dropUsers(requestParams: IUserRequest, byUser: IUserToken) {
    this.authorize(byUser);
    const finishDate = new Date();
    const { schoolId, userIds, role } = requestParams;
    const usersObj: IUser[] = await this.usersRepo.findMany({ '_id': { $in: userIds }, 'registration.schoolId': schoolId, role });
    this.validateAllUsersExist(usersObj, userIds, schoolId, role);
    return this._commandsProcessor.sendCommand('courses', this.doDropUsers, requestParams, finishDate);
  }

  private async doDropUsers({ schoolId, sectionId, courseId, userIds, role }: IUserRequest, finishDate: Date) {
    return this.coursesRepo.finishUsersInCourses({ _id: courseId, schoolId, sectionId }, `${role}s`, userIds, finishDate);
  }

  private validateAllUsersExist(usersObj: IUser[], userIds: string[], schoolId: string, role: Role) {
    if (usersObj.length !== userIds.length) {
      const notFound: string[] = userIds.reduce((list, id) => usersObj.some(user => user._id === id) ? list : [...list, id], <any>[]);
      throw new NotFoundError(`${role}s ['${notFound.join("', '")}'] were not found in '${schoolId}' school!`);
    }
  }

  protected authorize(byUser: IUserToken) {
    if (!byUser) throw new ForbiddenError('access token is required!');
    const isAuthorized = byUser.role.split(',').includes(config.authorizedRole);
    if (!isAuthorized) throw new UnauthorizedError('you are not authorized!');
  }

  protected newSectionId(grade: string, sectionId: string) {
    return `${grade}_${sectionId}_${generate('0123456789abcdef', 5)}`.toLocaleLowerCase().replace(/\s/g, '');
  }
}