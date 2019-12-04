import { IUnitOfWork, defaultPaging } from '@saal-oryx/unit-of-work';
import { IUserToken } from '../models/IUserToken';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import config from '../config';
import { ICreateSchoolRequest, IUpdateSchoolRequest, ICreateLicenseRequest } from '../models/requests/ISchoolRequests';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import generate = require('nanoid/non-secure/generate');
import validators from '../utils/validators';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';
import { ILicense, ISchool } from '../models/entities/ISchool';
import { ForbiddenError } from '../exceptions/ForbiddenError';
import { CommandsProcessor } from './CommandsProcessor';

import { IAcademicTerm } from '../models/entities/Common';

export class SchoolsService {

  constructor(protected _uow: IUnitOfWork, protected _commandsProcessor: CommandsProcessor) {
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
    validators.validateCreateSchool(createObj);
    const defaultLocale = createObj.locales.en || Object.values(createObj.locales)[0];
    const school: ISchool = {
      _id: this.newSchoolId(defaultLocale.name),
      locales: createObj.locales,
      location: createObj.location,
      academicTerms: []
    };
    return this._commandsProcessor.sendCommand('schools', this.doAdd, school);
  }

  async update(updateObj: IUpdateSchoolRequest, id: string, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    validators.validateUpdateSchool(updateObj);
    return this._commandsProcessor.sendCommand('schools', this.doUpdate, id, updateObj);
  }

  async updateAcademics(updateObj: IAcademicTerm, id: string, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    const academicTerms: IAcademicTerm = {
      _id: generate('0123456789abcdef', 10),
      year: updateObj.year,
      term: updateObj.term,
      startDate: new Date(updateObj.startDate),
      endDate: new Date(updateObj.endDate),
      gracePeriod: updateObj.gracePeriod,
      isEnabled: updateObj.isEnabled
     };
    validators.validateUpdateAcademicsSchool({academicTerms});
    const filterObj = {
      _id: id,
      academicTerms: {
        $not: {
          $elemMatch: {
            $or: [
              {
                $and: [
                  { startDate: { $gt: new Date(updateObj.startDate) } },
                  { startDate: { $lt: new Date(updateObj.endDate) } },
                ]
              },
              {
                $and: [
                  { startDate: { $lt: new Date(updateObj.startDate) } },
                  { endDate: { $gt: new Date(updateObj.endDate) } },
                ]
              },
              {
                $and: [
                  { startDate: { $gt: new Date(updateObj.startDate) } },
                  { endDate: { $lt: new Date(updateObj.endDate) } },
                ]
              },
              {
                $and: [
                  { endDate: { $gt: new Date(updateObj.startDate) } },
                  { endDate: { $lt: new Date(updateObj.endDate) } },
                ]
              }
            ]
          }
        }
      }
    };
    const updateAcademicTerm = {
      $addToSet: { academicTerms }
    };
   return this._commandsProcessor.sendCommand('schools', this.doUpdateAcademics, id, { filterObj, updateAcademicTerm });
  }

  async patch(updateObj: IUpdateSchoolRequest, id: string, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    if (!updateObj) throw new InvalidRequestError('Request should not be empty!');
    validators.validateUpdateSchool(updateObj);
    return this._commandsProcessor.sendCommand('schools', this.doPatch, id, updateObj);
  }

  async addLicense(licenseObj: ICreateLicenseRequest, id: string, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    validators.validateCreateLicense(licenseObj);
    const license: ILicense = {
      students: { max: licenseObj.students },
      teachers: { max: licenseObj.teachers },
      isEnabled: licenseObj.isEnabled,
      validFrom: new Date(),
      validTo: new Date(licenseObj.validTo),
      reference: licenseObj.reference || byUser.sub,
      package: licenseObj.package
    };
    return this._commandsProcessor.sendCommand('schools', this.doPatch, id, license);
  }

  async authorize(byUser: IUserToken) {
    if (!byUser) throw new ForbiddenError('access token is required!');
    return byUser.role.split(',').includes(config.authorizedRole);
  }

  newSchoolId(name: string) {
    return `${name.toLocaleLowerCase().replace(/\s/g, '')}_${generate('0123456789abcdef', 5)}`;
  }

  private async doAdd(school: ISchool) {
    return this.schoolsRepo.add(school);
  }

  private async doUpdate(id: string, updateObj: any) {
    return this.schoolsRepo.update({ _id: id }, { $set: updateObj });
  }

  private async doPatch(id: string, school: Partial<ISchool>) {
    return this.schoolsRepo.patch({ _id: id }, school);
  }

  private async doUpdateAcademics(id: string, updateObj: any) {
    return this.schoolsRepo.update({ _id: id }, { $addToSet: updateObj });
  }
}