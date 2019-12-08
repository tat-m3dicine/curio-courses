import { IUnitOfWork, IPaging } from '@saal-oryx/unit-of-work';
import validators from '../utils/validators';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import config from '../config';
import { IUserToken } from '../models/IUserToken';
import generate = require('nanoid/non-secure/generate');
import { ICreateCourseRequest } from '../models/requests/ICourseRequests';
import { NotFoundError } from '../exceptions/NotFoundError';
import { ICourse } from '../models/entities/ICourse';
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

export class CoursesService {

  constructor(protected _uow: IUnitOfWork, protected _commandsProcessor: CommandsProcessor) {
  }

  protected get schoolsRepo() {
    return this._uow.getRepository('Schools') as SchoolsRepository;
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
    if (!school || !school.license || !school.license.package) throw new InvalidLicenseError(`'${schoolId}' school doesn't have a vaild license!`);
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
    const studentsObj: IUser[] = [], teachersObj: IUser[] = [];
    if (usersIds.length > 0) {
      const users: IUser[] = await this.usersRepo.findMany({ '_id': { $in: usersIds }, 'registration.schoolId': schoolId });
      const usersMap: { [_id: string]: IUser } = users.reduce((map, user) => ({ ...map, [user._id]: user }), {});

      students.forEach(id => usersMap[id] && usersMap[id].role.includes(Role.student) && studentsObj.push(usersMap[id]));
      if (studentsObj.length !== students.length) throw new InvalidRequestError(`Some students aren't registered in school ${schoolId}!`);

      teachers.forEach(id => usersMap[id] && usersMap[id].role.includes(Role.teacher) && teachersObj.push(usersMap[id]));
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

  async enrollStudent(requestParams: IUserRequest, byUser: IUserToken) {
    return this.enrollUser({ ...requestParams, role: Role.student }, byUser);
  }

  async enrollTeacher(requestParams: IUserRequest, byUser: IUserToken) {
    return this.enrollUser({ ...requestParams, role: Role.teacher }, byUser);
  }

  private async enrollUser(requestParams: IUserRequest, byUser: IUserToken) {
    this.authorize(byUser);
    const { schoolId, userId, role } = requestParams;
    const userObj: IUser | undefined = await this.usersRepo.findOne({ '_id': userId, 'registration.schoolId': schoolId, role });
    if (!userObj) throw new NotFoundError(`${role} '${userId}' was not found in '${schoolId}' school!`);
    return this._commandsProcessor.sendCommand('courses', this.doEnrollUser, requestParams, userObj);
  }

  private async doEnrollUser({ schoolId, sectionId, courseId, userId, role }: IUserRequest, userObj: IUser) {
    const users = `${role}s`;
    return this.coursesRepo.update({
      _id: courseId, schoolId, sectionId,
      [users]: { $not: { $elemMatch: { _id: userId } } }
    }, {
      $push: { [users]: userObj }
    });
  }

  async dropStudent(requestParams: IUserRequest, byUser: IUserToken) {
    return this.dropUser({ ...requestParams, role: Role.student }, byUser);
  }

  async dropTeacher(requestParams: IUserRequest, byUser: IUserToken) {
    return this.dropUser({ ...requestParams, role: Role.teacher }, byUser);
  }

  private async dropUser(requestParams: IUserRequest, byUser: IUserToken) {
    this.authorize(byUser);
    const { schoolId, userId, role } = requestParams;
    const userObj: IUser | undefined = await this.usersRepo.findOne({ '_id': userId, 'registration.schoolId': schoolId, role });
    if (!userObj) throw new NotFoundError(`${role} '${userId}' was not found in '${schoolId}' school!`);
    return this._commandsProcessor.sendCommand('courses', this.doDropUser, requestParams);
  }

  private async doDropUser({ schoolId, sectionId, courseId, userId, role }: IUserRequest) {
    const users = `${role}s`;
    return this.coursesRepo.update({
      _id: courseId, schoolId, sectionId,
      [users]: { $elemMatch: { _id: userId } }
    }, {
      $pull: { [users]: { _id: userId } }
    });
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