import config from '../config';
import validators from '../utils/validators';
import generate from 'nanoid/non-secure/generate';
import { IUser } from '../models/entities/IUser';
import { IUserToken } from '../models/IUserToken';
import { IAcademicTerm } from '../models/entities/Common';
import { ILicenseRequest } from '../models/requests/ILicenseRequest';
import { ISchool, IAcademicTermRequest, ISchoolUserPermissions, ILicense } from '../models/entities/ISchool';
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

  async get(schoolId: string, byUser: IUserToken) {
    this.authorize(byUser);
    return this.schoolsRepo.findById(schoolId);
  }

  async delete(schoolId: string, byUser: IUserToken) {
    this.authorize(byUser);
    return this._commandsProcessor.sendCommand('schools', this.doDelete, schoolId);
  }

  private async doDelete(schoolId: string) {
    return this.schoolsRepo.delete({ _id: schoolId });
  }

  async list(paging = defaultPaging, byUser: IUserToken) {
    this.authorize(byUser);
    return this.schoolsRepo.findManyPage({}, paging);
  }

  async add(createObj: ICreateSchoolRequest, byUser: IUserToken) {
    this.authorize(byUser);
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

  private async doAdd(school: ISchool) {
    return this.schoolsRepo.add(school);
  }

  async update(updateObj: IUpdateSchoolRequest, schoolId: string, byUser: IUserToken) {
    this.authorize(byUser);
    validators.validateUpdateSchool(updateObj);
    return this._commandsProcessor.sendCommand('schools', this.doUpdate, schoolId, updateObj);
  }

  private async doUpdate(schoolId: string, updateObj: IUpdateSchoolRequest) {
    return this.schoolsRepo.update({ _id: schoolId }, { $set: updateObj });
  }

  async updateUsers(updateObjs: { users: IUpdateUserRequest[] }, schoolId: string, byUser: IUserToken) {
    this.authorize(byUser);
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
    this.authorize(byUser);
    validators.validateDeleteSchoolUsers(updateObjs);
    return this._commandsProcessor.sendCommand('schools', this.doDeleteUsers, schoolId, updateObjs.users);
  }

  private async doDeleteUsers(schoolId: string, usersIds: string[]) {
    return this.schoolsRepo.deleteUsersPermission(schoolId, usersIds);
  }

  async updateAcademicTerm(updateObj: IAcademicTermRequest, scoolId: string, byUser: IUserToken) {
    this.authorize(byUser);
    const academicTerm: IAcademicTerm = {
      _id: generate('0123456789abcdef', 10),
      year: updateObj.year,
      term: updateObj.term,
      startDate: new Date(updateObj.startDate),
      endDate: new Date(updateObj.endDate),
      gracePeriod: updateObj.gracePeriod,
      isEnabled: updateObj.isEnabled
    };
    validators.validateUpdateSchoolAcademicTerm({ academicTerm });
    return this._commandsProcessor.sendCommand('schools', this.doUpdateAcademicTerm, scoolId, updateObj, academicTerm);
  }

  private async doUpdateAcademicTerm(schoolId: string, updateObj: IAcademicTermRequest, academicTerm: IAcademicTerm) {
    return this.schoolsRepo.updateAcademicTerm(schoolId, updateObj, academicTerm);
  }

  async deleteAcademicTerm(requestParams: IDeleteAcademicTermRequest, byUser: IUserToken) {
    this.authorize(byUser);
    const { _id: schoolId, academicTermId } = { ...requestParams };
    const activeCourses = await this.coursesRepo.findMany({ 'academicTerm._id': academicTermId });
    if (activeCourses.length !== 0) {
      const coursesIds = activeCourses.map(course => course._id).join("', '");
      throw new ConditionalBadRequest(`Unable to delete the Academic Term because ['${coursesIds}'] are active within.`);
    }
    return this._commandsProcessor.sendCommand('schools', this.doDeleteAcademicTerm, schoolId, academicTermId);
  }

  private async doDeleteAcademicTerm(schoolId: string, academicTermId: string) {
    return this.schoolsRepo.deleteAcademicTerm(schoolId, academicTermId);
  }

  async patch(updateObj: IUpdateSchoolRequest, schoolId: string, byUser: IUserToken) {
    this.authorize(byUser);
    if (!updateObj) throw new InvalidRequestError('Request should not be empty!');
    validators.validateUpdateSchool(updateObj);
    return this._commandsProcessor.sendCommand('schools', this.doPatch, schoolId, updateObj);
  }

  private async doPatch(schoolId: string, updateObj: IUpdateSchoolRequest) {
    return this.schoolsRepo.patch({ _id: schoolId }, updateObj);
  }

  async patchLicense(licenseObj: ICreateLicenseRequest, schoolId: string, byUser: IUserToken) {
    this.authorize(byUser);
    validators.validateCreateLicense(licenseObj);
    const { grades, features = [], signupMethods = [] } = licenseObj.package;
    const license: ILicenseRequest = {
      students: { max: licenseObj.students },
      teachers: { max: licenseObj.teachers },
      isEnabled: licenseObj.isEnabled,
      validFrom: new Date(),
      validTo: new Date(licenseObj.validTo),
      reference: licenseObj.reference || byUser.sub,
      package: { grades, features, signupMethods }
    };
    /**
     * If validTo is less than existing license validTo
     */
    const isLicenseConflicts = await this.schoolsRepo.findOne({ '_id': schoolId, 'license.validTo': { $gt: license.validTo } });
    if (isLicenseConflicts) throw new InvalidRequestError('ValidTo conflicts with existing license validTo date, validTo should be greater');
    return this._commandsProcessor.sendCommand('schools', this.doPatchLicense, schoolId, license);
  }

  private async doPatchLicense(schoolId: string, updateObj: ILicense) {
    return this.schoolsRepo.patch({ _id: schoolId }, { license: updateObj });
  }

  private authorize(byUser: IUserToken) {
    if (!byUser) throw new ForbiddenError('access token is required!');
    const isAuthorized = byUser.role.split(',').includes(config.authorizedRole);
    if (!isAuthorized) throw new UnauthorizedError('you are not authorized!');
  }

  private newSchoolId(name: string) {
    return `${name.toLocaleLowerCase().replace(/\s/g, '')}_${generate('0123456789abcdef', 5)}`;
  }

  async doAddMany(schools: ISchool[]) {
    return this.schoolsRepo.addMany(schools, false);
  }
}
