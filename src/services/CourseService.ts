import { IUnitOfWork, defaultPaging } from '@saal-oryx/unit-of-work';
import { IUserToken } from '../models/IUserToken';
import { CourseRepository } from '../repositories/CourseRepository';
import config from '../config';
import { ICreateCourseRequest } from '../models/requests/ICreateCourseRequest';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import generate = require('nanoid/non-secure/generate');
import validators from '../utils/validators';

export class CourseService {

  constructor(protected _uow: IUnitOfWork) {
  }

  protected get courseRepo() {
    return this._uow.getRepository('Course') as CourseRepository;
  }

  async get(id: string) {
    return this.courseRepo.findById(id);
  }

  async delete(id: string) {
    return this.courseRepo.delete({ _id: id });
  }

  async list(paging = defaultPaging, byUser: IUserToken) {
    await this.authorize(byUser);
    return this.courseRepo.findManyPage({}, paging);
  }

  async add(createObj: ICreateCourseRequest, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    const defaultLocale = createObj.locales.en || Object.values(createObj.locales)[0];
    validators.validateCourse(createObj);
    // return this.courseRepo.add({
    //   _id: this.newSchoolId(defaultLocale.name),
    //   locales: createObj.locales,
    // });
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