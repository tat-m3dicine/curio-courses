import config from '../config';
import validators from '../utils/validators';
import generate from 'nanoid/non-secure/generate';

import { IUserToken } from '../models/IUserToken';
import { IAcademicTerm, IUser } from '../models/entities/Common';
import { ILicenseRequest } from '../models/requests/ILicenseRequest';
import { ISchool, IAcademicTermRequest, ISchoolUserPermissions } from '../models/entities/ISchool';
import { ICreateSchoolRequest, IUpdateSchoolRequest, ICreateLicenseRequest, IDeleteAcademicTermRequest, IUpdateUserRequest } from '../models/requests/ISchoolRequests';
import { CommandsProcessor } from './CommandsProcessor';
import { IUnitOfWork, defaultPaging } from '@saal-oryx/unit-of-work';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import { CoursesRepository } from '../repositories/CoursesRepository';
import { ForbiddenError } from '../exceptions/ForbiddenError';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';
import { ConditionalBadRequest } from '../exceptions/ConditionalBadRequest';
import { UsersRepository } from '../repositories/UsersRepository';
import { NotFoundError } from '../exceptions/NotFoundError';
import { validateAllObjectsExist } from '../utils/validators/AllObjectsExist';

export class SchoolsService {

  constructor(protected _uow: IUnitOfWork, protected _commandsProcessor: CommandsProcessor) {
  }

  protected get schoolsRepo() {
    return this._uow.getRepository('Schools') as SchoolsRepository;
  }

  protected get coursesRepo() {
    return this._uow.getRepository('Courses') as CoursesRepository;
  }

  protected get usersRepo() {
    return this._uow.getRepository('Users') as UsersRepository;
  }

  async get(id: string) {
    return this.schoolsRepo.findById(id);
  }

  async delete(id: string, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    return this._commandsProcessor.sendCommand('schools', this.doDelete, id);
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
      academicTerms: [],
      users: []
    };
    return this._commandsProcessor.sendCommand('schools', this.doAdd, school);
  }

  async update(updateObj: IUpdateSchoolRequest, id: string, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    validators.validateUpdateSchool(updateObj);
    return this._commandsProcessor.sendCommand('schools', this.doUpdate, { _id: id }, { $set: updateObj });
  }

  async updateUsers(updateObjs: { users: IUpdateUserRequest[] }, schoolId: string, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    validators.validateUpdateSchoolUsers(updateObjs);
    const usersIds: string[] = updateObjs.users.map(user => user._id);
    const usersObjs: IUser[] = await this.usersRepo.findMany({ '_id': { $in: usersIds }, 'registration.schoolId': schoolId });
    validateAllObjectsExist(usersObjs, usersIds, schoolId);
    return this._commandsProcessor.sendCommand('schools', this.doUpdateUsers, schoolId, updateObjs.users);
  }

  private async doUpdateUsers(schoolId: string, users: ISchoolUserPermissions[]) {
    return this.schoolsRepo.updateUsersPermission(schoolId, users);
  }

  async deleteUsers(updateObjs: { users: string[] }, schoolId: string, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    validators.validateDeleteSchoolUsers(updateObjs);
    return this._commandsProcessor.sendCommand('schools', this.doDeleteUsers, schoolId, updateObjs.users);
  }

  private async doDeleteUsers(schoolId: string, usersIds: string[]) {
    return this.schoolsRepo.deleteUsersPermission(schoolId, usersIds);
  }

  async updateAcademics(updateObj: IAcademicTermRequest, id: string, byUser: IUserToken) {
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
    validators.validateUpdateAcademicsSchool({ academicTerms });
    const { filterObj, updateAcademicTerm } = this.academicFilters(id, updateObj, academicTerms);
    return this._commandsProcessor.sendCommand('schools', this.doUpdate, filterObj, updateAcademicTerm);
  }

  async deleteAcademics(requestParams: IDeleteAcademicTermRequest, byUser: IUserToken) {
    const { _id: id, academicTermId } = { ...requestParams };
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();

    const transformDeleteObj = {
      $pull: { academicTerms: { _id: academicTermId } }
    };
    const activeCourses = await this.coursesRepo.findMany({ 'academicTerm._id': academicTermId });

    if (activeCourses.length !== 0) {
      const coursesIds = activeCourses.map(course => course._id).join("', '");
      throw new ConditionalBadRequest(`Unable to delete the Academic Term because ['${coursesIds}'] are active within.`);
    }
    return this._commandsProcessor.sendCommand('schools', this.doUpdate, { _id: id }, transformDeleteObj);
  }

  async patch(updateObj: IUpdateSchoolRequest, id: string, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    if (!updateObj) throw new InvalidRequestError('Request should not be empty!');
    validators.validateUpdateSchool(updateObj);
    return this._commandsProcessor.sendCommand('schools', this.doPatch, id, updateObj);
  }

  async patchLicense(licenseObj: ICreateLicenseRequest, id: string, byUser: IUserToken) {
    const isAuthorized = await this.authorize(byUser);
    if (!isAuthorized) throw new UnauthorizedError();
    validators.validateCreateLicense(licenseObj);
    const license: ILicenseRequest = {
      students: { max: licenseObj.students },
      teachers: { max: licenseObj.teachers },
      isEnabled: licenseObj.isEnabled,
      validFrom: new Date(),
      validTo: new Date(licenseObj.validTo),
      reference: licenseObj.reference || byUser.sub,
      package: licenseObj.package
    };
    /**
     * If validTo is less than existing license validTo
     */
    const isLicenseConflicts = await this.schoolsRepo.findOne({ '_id': id, 'license.validTo': { $gt: license.validTo } });
    if (isLicenseConflicts) throw new InvalidRequestError('ValidTo is conflicts with existing license validTo date, validTo should be greater than');
    return this._commandsProcessor.sendCommand('schools', this.doPatch, id, { license });
  }

  academicFilters(id: string, updateObj: IAcademicTermRequest, academicTerms: IAcademicTerm) {
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
              },
              {
                $and: [
                  { startDate: { $eq: new Date(updateObj.startDate) } },
                  { endDate: { $eq: new Date(updateObj.endDate) } },
                ]
              }
            ]
          }
        }
      }
    };
    const updateAcademicTerm = {
      $push: { academicTerms }
    };
    return { filterObj, updateAcademicTerm };
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

  private async doUpdate(filter: any, updateObj: any) {
    return this.schoolsRepo.update(filter, updateObj);
  }

  private async doPatch(id: string, school: Partial<ISchool>) {
    return this.schoolsRepo.patch({ _id: id }, school);
  }

  private async doDelete(id: string) {
    return this.schoolsRepo.delete({ _id: id });
  }
}
