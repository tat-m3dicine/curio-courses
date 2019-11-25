import { IUnitOfWork, defaultPaging } from '@saal-oryx/unit-of-work';
import { IUserToken } from '../models/IUserToken';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import config from '../config';
import { ICreateSchoolRequest, IUpdateSchoolRequest, ICreateLicenseRequest } from '../models/requests/ISchoolRequests';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import generate = require('nanoid/non-secure/generate');
import validators from '../utils/validators';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';
import { ILicense } from '../models/entities/ISchool';
import { ForbiddenError } from '../exceptions/ForbiddenError';

export class SchoolsService {

  constructor(protected _uow: IUnitOfWork) {
  }

  protected get schoolsRepo() {
    return this._uow.getRepository('Schools') as SchoolsRepository;
  }

  async get(id: string) {
    return this.schoolsRepo.findById(id);
  }

  async delete(id: string, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
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
    validators.validateCreateSchool(createObj);
    return this.schoolsRepo.add({
      _id: this.newSchoolId(defaultLocale.name),
      locales: createObj.locales,
      location: createObj.location
    });
  }

  async update(updateObj: IUpdateSchoolRequest, id: string, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    validators.validateUpdateSchool(updateObj);
    return this.schoolsRepo.update({ _id: id }, { $set: updateObj });
  }

  async patch(updateObj: IUpdateSchoolRequest, id: string, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    if (!updateObj) throw new InvalidRequestError('Request should not be empty!');
    validators.validateUpdateSchool(updateObj);
    return this.schoolsRepo.patch({ _id: id }, updateObj);
  }

  async addLicense(licenseObj: ICreateLicenseRequest, id: string, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    validators.validateCreateLicense(licenseObj);
    // ToDo: Validate `package.grade.subject.curriculums`
    const license: ILicense = {
      students: { max: licenseObj.students, consumed: 0 },
      teachers: { max: licenseObj.teachers, consumed: 0 },
      isEnabled: licenseObj.isEnabled,
      validFrom: new Date(),
      validTo: new Date(licenseObj.validTo),
      reference: licenseObj.reference || byUser.sub,
      package: licenseObj.package
    };
    return this.schoolsRepo.update({ _id: id }, { $set: { license } });
  }

  async authorize(byUser: IUserToken) {
    if (!byUser) throw new ForbiddenError('access token is required!');
    return byUser.role.split(',').includes(config.authorizedRole);
  }

  newSchoolId(name: string) {
    return `${name.toLocaleLowerCase().replace(/\s/g, '')}_${generate('0123456789abcdef', 5)}`;
  }

}