import { IUnitOfWork, defaultPaging } from '@saal-oryx/unit-of-work';
import { IUserToken } from '../models/IUserToken';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import config from '../config';
import { ICreateSchoolRequest } from '../models/requests/ICreateSchoolRequest';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import generate = require('nanoid/non-secure/generate');
import validators from '../utils/validators';

export class SchoolsService {

  constructor(protected _uow: IUnitOfWork) {
  }

  protected get schoolsRepo() {
    return this._uow.getRepository('Schools') as SchoolsRepository;
  }

  async get(id: string) {
    return this.schoolsRepo.findById(id);
  }

  async delete(id: string) {
    return this.schoolsRepo.delete({ _id: id });
  }

  async list(paging = defaultPaging, byUser: IUserToken) {
    await this.authorize(byUser);
    return this.schoolsRepo.findManyPage({}, paging);
  }

  async add(createObj: ICreateSchoolRequest, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    const defaultLocale = createObj.locales.en || Object.values(createObj.locales)[0];
    validators.validateSchool(createObj);
    return this.schoolsRepo.add({
      _id: this.newSchoolId(defaultLocale.name),
      locales: createObj.locales,
      location: createObj.location,
      academicTerms: []
    });
  }

  // async patch(id: string, data: Partial<ITicketIssuerUpdateRequest>, byUser: IUserToken) {
  //   const isAuthorized = await this.authorize(byUser);
  //   if (!isAuthorized) throw new UnauthorizedError();
  //   if (!data) throw new InvalidRequestError('Request should not be empty!');
  //   await this.validatorUpdateIssuer(data);
  //   delete data._id;
  //   delete data.secret;
  //   return this.repo.patch({ _id: id }, data, false);
  // }



  // async validate(id: string, secret: string) {
  //   const issuer = await this.repo.findById(id);
  //   if (!issuer) return undefined;
  //   if (issuer.secret !== secret) return undefined;
  //   if (!issuer.isEnabled) return undefined;
  //   return issuer;
  // }

  // async validatorUpdateIssuer(request: Partial<ITicketIssuerUpdateRequest>) {
  //   return Promise.resolve(validators.validateUpdateIssuer(request));
  // }

  async authorize(byUser: IUserToken) {
    return byUser.role.split(',').includes(config.authorizedRole);
  }

  newSchoolId(name: string) {
    return `${name.toLocaleLowerCase().replace(/\s/g, '')}_${generate('0123456789abcdef', 5)}`;
  }

}