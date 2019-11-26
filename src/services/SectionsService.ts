import { IUnitOfWork, IPaging } from '@saal-oryx/unit-of-work';
import validators from '../utils/validators';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import config from '../config';
import { IUserToken } from '../models/IUserToken';
import { SectionsRepository } from '../repositories/SectionsRepository';
import { StudentsRepository } from '../repositories/StudentsRepository';
import generate = require('nanoid/non-secure/generate');
import { ICreateSectionRequest } from '../models/requests/ICreateSectionRequest';
import { NotFoundError } from '../exceptions/NotFoundError';
import { ISection } from '../models/entities/ISection';
import { IStudent } from '../models/entities/Common';
import { CoursesRepository } from '../repositories/CoursesRepository';
import { ForbiddenError } from '../exceptions/ForbiddenError';

export class SectionsService {

  constructor(protected _uow: IUnitOfWork) {
  }

  protected get sectionsRepo() {
    return this._uow.getRepository('Sections') as SectionsRepository;
  }

  protected get studentsRepo() {
    return this._uow.getRepository('Students') as StudentsRepository;
  }

  async create(section: ICreateSectionRequest, byUser: IUserToken) {
    this.authorize(byUser);
    validators.validateCreateSection(section);
    return this.sectionsRepo.add({
      _id: this.newSectionId(section),
      students: [],
      ...section
    });
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
    return this.sectionsRepo.delete({ _id: sectionId });
  }

  async getStudents(schoolId: string, sectionId: string, byUser: IUserToken) {
    this.authorize(byUser);
    const section = await this.sectionsRepo.findOne({ _id: sectionId, schoolId });
    return section ? section.students : undefined;
  }

  async registerStudents(schoolId: string, sectionId: string, studentIds: string[], byUser: IUserToken) {
    this.authorize(byUser);
    const section: ISection | undefined = await this.sectionsRepo.findOne({ _id: sectionId, schoolId });
    if (!section) throw new NotFoundError(`Couldn't find section '${sectionId}' in school '${schoolId}'`);

    studentIds = studentIds.filter(_id => !section.students.some(student => student._id === _id));
    const dbStudents: IStudent[] = await this.studentsRepo.findMany({ _id: { $in: studentIds } });
    const students: IStudent[] = studentIds.map(_id => dbStudents.find(student => student._id === _id) || { _id });

    return this.sectionsRepo.update({ _id: sectionId, schoolId }, {
      $push: { students: { $each: students } }
    });
  }

  async removeStudents(schoolId: string, sectionId: string, studentIds: string[], byUser: IUserToken) {
    this.authorize(byUser);
    const section: ISection | undefined = await this.sectionsRepo.findOne({ _id: sectionId, schoolId });
    if (!section) throw new NotFoundError(`Couldn't find section '${sectionId}' in school '${schoolId}'`);

    const coursesRepoWithTransactions = this._uow.getRepository('Courses', true) as CoursesRepository;
    const sectionsRepoWithTransactions = this._uow.getRepository('Sections', true) as SectionsRepository;

    await coursesRepoWithTransactions.finishStudentsCourses({ _id: sectionId, schoolId }, studentIds);
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
}