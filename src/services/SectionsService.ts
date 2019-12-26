import { IUnitOfWork, IPaging } from '@saal-oryx/unit-of-work';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import config from '../config';
import { IUserToken } from '../models/IUserToken';
import { SectionsRepository } from '../repositories/SectionsRepository';
import { UsersRepository } from '../repositories/UsersRepository';
import { ICreateSectionRequest } from '../models/requests/ISectionRequests';
import { NotFoundError } from '../exceptions/NotFoundError';
import { ISection } from '../models/entities/ISection';
import { CoursesRepository } from '../repositories/CoursesRepository';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import { ISchool } from '../models/entities/ISchool';
import { InvalidLicenseError } from '../exceptions/InvalidLicenseError';
import { ForbiddenError } from '../exceptions/ForbiddenError';
import { CommandsProcessor } from './CommandsProcessor';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';
import { Role } from '../models/Role';
import { IUser } from '../models/entities/IUser';
import { validateAllObjectsExist } from '../utils/validators/AllObjectsExist';
import { newSectionId } from '../utils/IdGenerator';

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
    const { schoolId, locales, grade, students } = section;
    if (students) {
      await this.validateStudentsInSchool(students, schoolId);
    }
    await this.validateWithSchoolLicense(grade, schoolId);
    return this._commandsProcessor.sendCommand('sections', this.doCreate, <ISection>{
      _id: section._id || newSectionId(schoolId, grade, locales),
      locales, schoolId, grade,
      students: students || []
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
    await this.validateStudentsInSchool(studentIds, schoolId);
    return this._commandsProcessor.sendCommand('sections', this.doRegisterStudents, schoolId, sectionId, studentIds);
  }

  private async doRegisterStudents(schoolId: string, sectionId: string, studentIds: string[]) {
    return this.sectionsRepo.addStudents({ _id: sectionId, schoolId }, studentIds);
  }

  async removeStudents(schoolId: string, sectionId: string, studentIds: string[], byUser: IUserToken) {
    this.authorize(byUser);
    const section: ISection | undefined = await this.sectionsRepo.findOne({ _id: sectionId, schoolId });
    if (!section) throw new NotFoundError(`Couldn't find section '${sectionId}' in school '${schoolId}'`);
    return this._commandsProcessor.sendCommand('sections', this.doRemoveStudents, schoolId, sectionId, studentIds, new Date());
  }

  private async doRemoveStudents(schoolId: string, sectionId: string, studentIds: string[], finishDate: Date) {
    const coursesRepoWithTransactions = this._uow.getRepository('Courses', true) as CoursesRepository;
    const sectionsRepoWithTransactions = this._uow.getRepository('Sections', true) as SectionsRepository;

    const coursesUpdates = [{ filter: { sectionId, schoolId }, usersIds: studentIds }];
    await coursesRepoWithTransactions.finishUsersInCourses(coursesUpdates, Role.student, finishDate);
    const updatedSection = await sectionsRepoWithTransactions.removeStudents({ _id: sectionId, schoolId }, studentIds);
    await this._uow.commit();
    return updatedSection;
  }

  protected authorize(byUser: IUserToken) {
    if (!byUser) throw new ForbiddenError('access token is required!');
    const isAuthorized = byUser.role.split(',').includes(config.authorizedRole);
    if (!isAuthorized) throw new UnauthorizedError('you are not authorized!');
  }

  protected async validateStudentsInSchool(studentIds: string[], schoolId: string) {
    const dbStudents: IUser[] = await this.usersRepo.findMany({ '_id': { $in: studentIds }, 'school._id': schoolId, 'role': Role.student });
    validateAllObjectsExist(dbStudents, studentIds, schoolId, Role.student);
  }

  protected async validateWithSchoolLicense(grade: string, schoolId: string) {
    const school: ISchool | undefined = await this.schoolsRepo.findById(schoolId);
    if (!school || !school.license || !school.license.package || !(grade in school.license.package.grades)) {
      throw new InvalidLicenseError(`'${schoolId}' school doesn't have a valid license for grade '${grade}'`);
    }
  }
}