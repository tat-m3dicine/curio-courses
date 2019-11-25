import { IUnitOfWork, IPaging } from '@saal-oryx/unit-of-work';
import validators from '../utils/validators';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import config from '../config';
import { IUserToken } from '../models/IUserToken';
import { SectionsRepository } from '../repositories/SectionsRepository';

export class SectionsService {

  constructor(protected _uow: IUnitOfWork) {
  }

  protected get sectionsRepo() {
    return this._uow.getRepository('Sections') as SectionsRepository;
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
    return byUser.role.split(',').includes(config.authorizedRole);
  }
}