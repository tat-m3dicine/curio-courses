import { IUnitOfWork, IPaging } from '@saal-oryx/unit-of-work';
import validators from '../utils/validators';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import config from '../config';
import { IUserToken } from '../models/IUserToken';
import { SectionsRepository } from '../repositories/SectionsRepository';
import generate = require('nanoid/non-secure/generate');
import { ICreateSectionRequest } from '../models/requests/ICreateSectionRequest';

export class SectionsService {

  constructor(protected _uow: IUnitOfWork) {
  }

  protected get sectionsRepo() {
    return this._uow.getRepository('Sections') as SectionsRepository;
  }

  async create(section: ICreateSectionRequest, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    validators.validateCreateSection(section);
    return this.sectionsRepo.add({
      _id: this.newSectionId(section),
      students: [],
      ...section
    });
  }

  async get(id: string, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    return this.sectionsRepo.findById(id);
  }

  async list(paging: IPaging, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    return this.sectionsRepo.findManyPage({}, paging);
  }

  async delete(id: string, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    return this.sectionsRepo.delete({ _id: id });
  }

  async registerStudents(schoolId: string, sectionId: string, students: string[], byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    // TODO: implement function
    return {};
  }

  async removeStudents(schoolId: string, sectionId: string, students: string[], byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    // TODO: implement function
    return {};
  }

  protected async authorize(byUser: IUserToken) {
    return byUser && byUser.role && byUser.role.split(',').includes(config.authorizedRole);
  }

  protected newSectionId(section: ICreateSectionRequest) {
    return `${section.grade}_${section.schoolId}_${generate('0123456789abcdef', 5)}`.toLocaleLowerCase().replace(/\s/g, '');
  }
}