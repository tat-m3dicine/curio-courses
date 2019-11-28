import { IUnitOfWork, IPaging } from '@saal-oryx/unit-of-work';
import validators from '../utils/validators';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import config from '../config';
import { IUserToken } from '../models/IUserToken';
import generate = require('nanoid/non-secure/generate');
import { ICreateCourseRequest } from '../models/requests/ICourseRequests';
import { NotFoundError } from '../exceptions/NotFoundError';
import { ICourse } from '../models/entities/ICourse';
import { IStudent } from '../models/entities/Common';
import { StudentsRepository } from '../repositories/StudentsRepository';
import { CoursesRepository } from '../repositories/CoursesRepository';
import { SectionsRepository } from '../repositories/SectionsRepository';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import { ISchool } from '../models/entities/ISchool';
import { InvalidLicenseError } from '../exceptions/InvalidLicenseError';
import { ForbiddenError } from '../exceptions/ForbiddenError';
import { CommandsProcessor } from './CommandsProcessor';

export class CoursesService {

  constructor(protected _uow: IUnitOfWork, protected _commandsProcessor: CommandsProcessor) {
  }

  protected get schoolsRepo() {
    return this._uow.getRepository('Schools') as SchoolsRepository;
  }

  protected get sectionsRepo() {
    return this._uow.getRepository('Sections') as SectionsRepository;
  }

  protected get coursesRepo() {
    return this._uow.getRepository('Courses') as CoursesRepository;
  }

  async create(course: ICreateCourseRequest, byUser: IUserToken) {
    this.authorize(byUser);
    validators.validateCreateCourse(course);
    await this.validateLicense(course);
    return this._commandsProcessor.sendCommand('courses', this.doCreate, {
      _id: this.newSectionId(course),
      students: [],
      ...course
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

  protected authorize(byUser: IUserToken) {
    if (!byUser) throw new ForbiddenError('access token is required!');
    const isAuthorized = byUser.role.split(',').includes(config.authorizedRole);
    if (!isAuthorized) throw new UnauthorizedError('you are not authorized!');
  }

  protected newSectionId(section: ICreateCourseRequest) {
    return `${section.grade}_${section.sectionId}_${generate('0123456789abcdef', 5)}`.toLocaleLowerCase().replace(/\s/g, '');
  }

  protected async validateLicense(course: ICreateCourseRequest) {
    // Implement course creation license validation
  }
}