import { IUnitOfWork, IPaging } from '@saal-oryx/unit-of-work';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import config from '../config';
import { IUserToken } from '../models/IUserToken';
import { SectionsRepository } from '../repositories/SectionsRepository';
import { UsersRepository } from '../repositories/UsersRepository';
import { ICreateSectionRequest, ICreateSectionCourse } from '../models/requests/ISectionRequests';
import { NotFoundError } from '../exceptions/NotFoundError';
import { ISection } from '../models/entities/ISection';
import { CoursesRepository } from '../repositories/CoursesRepository';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import { InvalidLicenseError } from '../exceptions/InvalidLicenseError';
import { ForbiddenError } from '../exceptions/ForbiddenError';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';
import { Role } from '../models/Role';
import { IUser } from '../models/entities/IUser';
import { validateAllObjectsExist } from '../utils/validators/AllObjectsExist';
import { newSectionId, newCourseId } from '../utils/IdGenerator';
import { Repo } from '../models/RepoNames';
import { CommandsProcessor } from '@saal-oryx/event-sourcing';
import { Service } from '../models/ServiceName';
import { CoursesService } from './CoursesService';
import { ICourse, IUserCourseInfo } from '../models/entities/ICourse';
import { ISchool } from '../models/entities/ISchool';
import validators from '../utils/validators';

export class SectionsService {

  constructor(protected _uow: IUnitOfWork, protected _commandsProcessor: CommandsProcessor) {
  }

  protected get schoolsRepo() {
    return this._uow.getRepository(Repo.schools) as SchoolsRepository;
  }

  protected get sectionsRepo() {
    return this._uow.getRepository(Repo.sections) as SectionsRepository;
  }

  protected get usersRepo() {
    return this._uow.getRepository(Repo.users) as UsersRepository;
  }

  async create(section: ICreateSectionRequest, byUser: IUserToken) {
    this.authorize(byUser);
    validators.validateCreateSection(section);
    const { schoolId, locales, grade, students = [], courses } = section;
    const school = await this.schoolsRepo.findById(schoolId);
    if (!school) throw new NotFoundError(`'${schoolId}' school was not found!`);
    await this.validateSectionInLicense(school, grade, courses);
    if (students.length > 0) await this.validateStudentsInSchool(students, schoolId);
    const sectionId = section._id || newSectionId(schoolId, grade, locales);
    let createCourses;
    if (courses) {
      const joinDate = new Date();
      const academicTerm = CoursesService.validateAndGetAcademicTerm(school);
      createCourses = courses.map(({ subject, curriculum, enroll }) => <ICourse>{
        _id: newCourseId(sectionId, subject, academicTerm.year),
        schoolId, sectionId, curriculum, grade, subject, academicTerm,
        defaultLocale: Object.keys(locales)[0] || 'en',
        locales: { en: { name: subject, description: `${subject} course` } },
        students: enroll ? students.map(s => <IUserCourseInfo>{ _id: s, isEnabled: true, joinDate }) : [],
        teachers: [], isEnabled: true
      });
    }
    return this._commandsProcessor.sendCommand(Service.sections, this.doCreate, <ISection>{
      _id: sectionId,
      locales, schoolId, grade,
      students: students || []
    }, createCourses);
  }

  private async doCreate(section: ISection, courses?: ICourse[]) {
    const result = await this.sectionsRepo.add(section);
    if (courses) {
      await this._commandsProcessor.sendManyCommandsAsync(Service.courses, <any>{ name: 'doCreate' }, courses.map(c => [c]));
    }
    return result;
  }

  async get(schoolId: string, sectionId: string, byUser: IUserToken) {
    this.authorize(byUser, schoolId);
    return this.sectionsRepo.findOne({ _id: sectionId, schoolId });
  }

  async list(filter: { schoolId: string, grade?: string }, paging: IPaging, byUser: IUserToken) {
    this.authorize(byUser, filter.schoolId);
    return this.sectionsRepo.findManyPage({ schoolId: filter.schoolId, ...(filter.grade ? { grade: filter.grade } : {}) }, paging);
  }

  async delete(schoolId: string, sectionId: string, byUser: IUserToken) {
    this.authorize(byUser, schoolId);
    const section = await this.sectionsRepo.findOne({ _id: sectionId, schoolId });
    if (!section) throw new NotFoundError(`Couldn't find section '${sectionId}' in school '${schoolId}'`);
    return this._commandsProcessor.sendCommand(Service.sections, this.doDelete, sectionId);
  }

  private async doDelete(sectionId: string) {
    return this.sectionsRepo.delete({ _id: sectionId });
  }

  async getStudents(schoolId: string, sectionId: string, byUser: IUserToken) {
    this.authorize(byUser, schoolId);
    const section = await this.sectionsRepo.findOne({ _id: sectionId, schoolId });
    return section && section.students;
  }

  async registerStudents(schoolId: string, sectionId: string, studentIds: string[], byUser: IUserToken) {
    this.authorize(byUser, schoolId);
    if (!studentIds || studentIds.length === 0) throw new InvalidRequestError('No students were provided!');
    const section: ISection | undefined = await this.sectionsRepo.findOne({ _id: sectionId, schoolId });
    if (!section) throw new NotFoundError(`Couldn't find section '${sectionId}' in school '${schoolId}'`);
    const studentsDifference = section.students.filter(studentId => !studentIds.includes(studentId));
    if (studentsDifference.length === 0) throw new InvalidRequestError(`All students are already registered in section ${sectionId}`);
    await this.validateStudentsInSchool(studentIds, schoolId);
    return this._commandsProcessor.sendCommand(Service.sections, this.doRegisterStudents, schoolId, sectionId, studentIds);
  }

  private async doRegisterStudents(schoolId: string, sectionId: string, studentIds: string[]) {
    return this.sectionsRepo.addStudents({ _id: sectionId, schoolId }, studentIds);
  }

  async removeStudents(schoolId: string, sectionId: string, studentIds: string[], byUser: IUserToken) {
    this.authorize(byUser, schoolId);
    const section: ISection | undefined = await this.sectionsRepo.findOne({ _id: sectionId, schoolId });
    if (!section) throw new NotFoundError(`Couldn't find section '${sectionId}' in school '${schoolId}'`);
    return this._commandsProcessor.sendCommand(Service.sections, this.doRemoveStudents, schoolId, sectionId, studentIds, new Date());
  }

  private async doRemoveStudents(schoolId: string, sectionId: string, studentIds: string[], finishDate: Date) {
    const coursesRepoWithTransactions = this._uow.getRepository(Repo.courses, true) as CoursesRepository;
    const sectionsRepoWithTransactions = this._uow.getRepository(Repo.sections, true) as SectionsRepository;

    const coursesUpdates = [{ filter: { sectionId, schoolId }, usersIds: studentIds }];
    await coursesRepoWithTransactions.finishUsersInCourses(coursesUpdates, Role.student, finishDate);
    const updatedSection = await sectionsRepoWithTransactions.removeStudents({ _id: sectionId, schoolId }, studentIds);
    await this._uow.commit();
    return updatedSection;
  }

  protected authorize(byUser: IUserToken, schoolId?: string) {
    if (!byUser) throw new ForbiddenError('access token is required!');
    if (byUser.role.includes(config.authorizedRole)) return true;
    if (byUser.role.includes(Role.principal) && byUser.schooluuid === schoolId) return true;
    throw new UnauthorizedError('you are not authorized to do this action');
  }

  protected async validateStudentsInSchool(studentIds: string[], schoolId: string) {
    const dbStudents: IUser[] = await this.usersRepo.findMany({ '_id': { $in: studentIds }, 'school._id': schoolId, 'role': Role.student });
    validateAllObjectsExist(dbStudents, studentIds, schoolId, Role.student);
  }

  protected async validateSectionInLicense(school: ISchool, grade: string, courses?: ICreateSectionCourse[]) {
    if (!school.license || !school.license.package || !(grade in school.license.package.grades)) {
      throw new InvalidLicenseError(`'${school._id}' school doesn't have a valid license for grade '${grade}'`);
    }
    if (courses) {
      for (const course of courses) {
        CoursesService.validateCourseInPackage(school.license.package, grade, course.subject, course.curriculum);
      }
    }
  }
}