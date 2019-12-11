import { IUnitOfWork, IPaging } from '@saal-oryx/unit-of-work';
import validators from '../utils/validators';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import config from '../config';
import { IUserToken } from '../models/IUserToken';
import { SectionsRepository } from '../repositories/SectionsRepository';
import { UsersRepository } from '../repositories/UsersRepository';
import generate = require('nanoid/non-secure/generate');
import { ICreateSectionRequest } from '../models/requests/ISectionRequests';
import { NotFoundError } from '../exceptions/NotFoundError';
import { ISection } from '../models/entities/ISection';
import { IUser } from '../models/entities/Common';
import { CoursesRepository } from '../repositories/CoursesRepository';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import { ISchool } from '../models/entities/ISchool';
import { InvalidLicenseError } from '../exceptions/InvalidLicenseError';
import { ForbiddenError } from '../exceptions/ForbiddenError';
import { CommandsProcessor } from './CommandsProcessor';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';
import { Role } from '../models/Role';

export class SectionsService {

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

  async create(section: ICreateSectionRequest, byUser: IUserToken) {
    this.authorize(byUser);
    validators.validateCreateSection(section);
    if (section.students) {
      await this.validateStudentsInSchool(section.students, section.schoolId);
    }
    await this.validateWithSchoolLicense(section.grade, section.schoolId);
    return this._commandsProcessor.sendCommand('sections', this.doCreate, <ISection>{
      _id: this.newSectionId(section),
      locales: section.locales,
      schoolId: section.schoolId,
      grade: section.grade,
      students: section.students || []
    });
  }

  private async doCreate(section: ISection) {
    return this.sectionsRepo.add(section);
  }

  async get(schoolId: string, sectionId: string, byUser: IUserToken) {
    this.authorize(byUser);
    return this.sectionsRepo.findOne({ _id: sectionId, schoolId });
  }

  async list(schoolId: string, paging: IPaging, byUser: IUserToken) {
    this.authorize(byUser);
    return this.sectionsRepo.findManyPage({ schoolId }, paging);
  }

  async delete(schoolId: string, sectionId: string, byUser: IUserToken) {
    this.authorize(byUser);
    const section = await this.sectionsRepo.findOne({ _id: sectionId, schoolId });
    if (!section) throw new NotFoundError(`Couldn't find section '${sectionId}' in school '${schoolId}'`);
    return this._commandsProcessor.sendCommand('sections', this.doDelete, sectionId);
  }

  private async doDelete(sectionId: string) {
    return this.sectionsRepo.delete({ _id: sectionId });
  }

  async getStudents(schoolId: string, sectionId: string, byUser: IUserToken) {
    this.authorize(byUser);
    const section = await this.sectionsRepo.findOne({ _id: sectionId, schoolId });
    return section ? section.students : undefined;
  }

  async registerStudents(schoolId: string, sectionId: string, studentIds: string[], byUser: IUserToken) {
    this.authorize(byUser);
    if (!studentIds || studentIds.length === 0) return new InvalidRequestError('No students were provided!');
    const section: ISection | undefined = await this.sectionsRepo.findOne({ _id: sectionId, schoolId });
    if (!section) throw new NotFoundError(`Couldn't find section '${sectionId}' in school '${schoolId}'`);

    studentIds = studentIds.filter(studentId => !section.students.includes(studentId));
    if (studentIds.length === 0) return new InvalidRequestError(`All students were already registered in section ${sectionId}`);
    await this.validateStudentsInSchool(studentIds, sectionId);
    return this._commandsProcessor.sendCommand('sections', this.doRegisterStudents, sectionId, schoolId, studentIds);
  }

  private async doRegisterStudents(sectionId: string, schoolId: string, studentIds: string[]) {
    return this.sectionsRepo.update({ _id: sectionId, schoolId }, {
      $addToSet: { students: studentIds }
    });
  }

  async removeStudents(schoolId: string, sectionId: string, studentIds: string[], byUser: IUserToken) {
    this.authorize(byUser);
    const section: ISection | undefined = await this.sectionsRepo.findOne({ _id: sectionId, schoolId });
    if (!section) throw new NotFoundError(`Couldn't find section '${sectionId}' in school '${schoolId}'`);
    return this._commandsProcessor.sendCommand('sections', this.doRemoveStudents, sectionId, schoolId, studentIds);
  }

  private async doRemoveStudents(sectionId: string, schoolId: string, studentIds: string[]) {
    const coursesRepoWithTransactions = this._uow.getRepository('Courses', true) as CoursesRepository;
    const sectionsRepoWithTransactions = this._uow.getRepository('Sections', true) as SectionsRepository;

    await coursesRepoWithTransactions.finishUsersInCourses({ sectionId, schoolId }, 'students', studentIds, new Date());
    const updatedSection = await sectionsRepoWithTransactions.update({ _id: sectionId, schoolId }, {
      $pull: { students: { _id: { $in: studentIds } } }
    });
    await this._uow.commit();
    return updatedSection;
  }

  protected authorize(byUser: IUserToken) {
    if (!byUser) throw new ForbiddenError('access token is required!');
    const isAuthorized = byUser.role.split(',').includes(config.authorizedRole);
    if (!isAuthorized) throw new UnauthorizedError('you are not authorized!');
  }

  protected newSectionId(section: ICreateSectionRequest) {
    return `${section.grade}_${section.schoolId}_${generate('0123456789abcdef', 5)}`.toLocaleLowerCase().replace(/\s/g, '');
  }

  protected async validateStudentsInSchool(studentIds: string[], schoolId: string) {
    const dbStudents: IUser[] = await this.usersRepo.findMany({ '_id': { $in: studentIds }, 'registration.schoolId': schoolId, 'role': Role.student });
    if (studentIds.length !== dbStudents.length) {
      const notRegistered = studentIds.filter(_id => dbStudents.find(student => student._id === _id));
      throw new InvalidRequestError(`Students [${notRegistered.join(',')}] aren't registered in school ${schoolId}!`);
    }
  }

  protected async validateWithSchoolLicense(schoolId: string, grade: string) {
    const school: ISchool | undefined = await this.schoolsRepo.findById(schoolId);
    if (!school || !school.license || !school.license.package || !(grade in school.license.package)) {
      throw new InvalidLicenseError(`'${schoolId}' school doesn't have a valid license for grade '${grade}'`);
    }
  }
}