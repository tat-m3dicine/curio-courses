import config from '../config';
import validators from '../utils/validators';
import { IUser, Status } from '../models/entities/IUser';
import { IUserToken } from '../models/IUserToken';
import { IAcademicTerm } from '../models/entities/Common';
import { ILicenseRequest } from '../models/requests/ILicenseRequest';
import { ISchool, ISchoolUserPermissions, ILicense } from '../models/entities/ISchool';
import { ICreateSchoolRequest, IUpdateSchoolRequest, ICreateLicenseRequest, IDeleteAcademicTermRequest, IUpdateUserRequest, IUpdateAcademicTermRequest } from '../models/requests/ISchoolRequests';
import { IUnitOfWork, defaultPaging, IPaging } from '@saal-oryx/unit-of-work';
import { SchoolsRepository } from '../repositories/SchoolsRepository';
import { SectionsRepository } from '../repositories/SectionsRepository';
import { CoursesRepository } from '../repositories/CoursesRepository';
import { ForbiddenError } from '../exceptions/ForbiddenError';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';
import { ConditionalBadRequest } from '../exceptions/ConditionalBadRequest';
import { UsersRepository } from '../repositories/UsersRepository';
import { validateAllObjectsExist } from '../utils/validators/AllObjectsExist';
import { Role } from '../models/Role';
import loggerFactory from '../utils/logging';
import { IRegistrationAction, ISwitchRegistrationAction } from '../models/requests/IRegistrationAction';
import { InvalidLicenseError } from '../exceptions/InvalidLicenseError';
import { newSchoolId, newAcademicTermId } from '../utils/IdGenerator';
import { Repo } from '../models/RepoNames';
import { CommandsProcessor, KafkaService } from '@saal-oryx/event-sourcing';
import { Events } from './processors/UpdatesProcessor';
import { Service } from '../models/ServiceName';

const logger = loggerFactory.getLogger('SchoolsService');

export class SchoolsService {

  constructor(protected _uow: IUnitOfWork, protected _commandsProcessor: CommandsProcessor, protected _kafkaService: KafkaService) {
  }

  protected get schoolsRepo() {
    return this._uow.getRepository(Repo.schools) as SchoolsRepository;
  }

  protected get coursesRepo() {
    return this._uow.getRepository(Repo.courses) as CoursesRepository;
  }

  protected get usersRepo() {
    return this._uow.getRepository(Repo.users) as UsersRepository;
  }

  async get(schoolId: string, byUser: IUserToken) {
    this.authorize(byUser);
    return this.schoolsRepo.findById(schoolId);
  }

  async delete(schoolId: string, byUser: IUserToken) {
    this.authorize(byUser);
    return this._commandsProcessor.sendCommand(Service.schools, this.doDelete, schoolId);
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
      _id: createObj._id || newSchoolId(defaultLocale.name),
      locales: createObj.locales,
      location: createObj.location,
      academicTerms: [],
      users: []
    };
    return this._commandsProcessor.sendCommand(Service.schools, this.doAdd, school);
  }

  private async doAdd(school: ISchool) {
    return this.schoolsRepo.add(school);
  }

  async update(updateObj: IUpdateSchoolRequest, schoolId: string, byUser: IUserToken) {
    this.authorize(byUser);
    validators.validateUpdateSchool(updateObj);
    return this._commandsProcessor.sendCommand(Service.schools, this.doUpdate, schoolId, updateObj);
  }

  private async doUpdate(schoolId: string, updateObj: IUpdateSchoolRequest) {
    return this.schoolsRepo.update({ _id: schoolId }, { $set: updateObj });
  }

  async updateUsers(updateObjs: { users: IUpdateUserRequest[] }, schoolId: string, byUser: IUserToken) {
    this.authorize(byUser);
    validators.validateUpdateSchoolUsers(updateObjs);
    const usersIds: string[] = updateObjs.users.map(user => user._id);
    const usersObjs: IUser[] = await this.usersRepo.findMany({ '_id': { $in: usersIds }, 'school._id': schoolId });
    validateAllObjectsExist(usersObjs, usersIds, schoolId);
    return this._commandsProcessor.sendCommand(Service.schools, this.doUpdateUsers, schoolId, updateObjs.users);
  }

  async getUsers(filter: { schoolId: string, role: Role, status: 'all' | Status }, paging: IPaging, byUser: IUserToken) {
    this.authorize(byUser);
    const _filter: any = {
      role: filter.role
    };
    if (filter.status === 'all') {
      _filter.$or = [
        { ['school._id']: filter.schoolId },
        { ['registration.schoolId']: filter.schoolId },
      ];
    } else if (filter.status === Status.active) {
      _filter['school._id'] = filter.schoolId;
    } else if (filter.status === Status.inactive) {
      _filter['registration.schoolId'] = filter.schoolId;
    }
    else {
      if (filter.status) _filter.registration.status = filter.status;
      _filter['registration.school._id'] = filter.schoolId;
    }
    logger.debug('getUsers filter:', _filter);
    return this.usersRepo.findManyPage(_filter, paging);
  }

  async validateUsersInSchool(request: IRegistrationAction) {
    const filter: any = { _id: { $in: request.users }, role: request.role };
    if (request.action === 'withdraw') {
      filter['school._id'] = request.schoolId;
    } else {
      filter['registration.school._id'] = request.schoolId;
    }
    const count = await this.usersRepo.count(filter);
    if (count !== request.users.length) throw new InvalidRequestError(`Some ${request.role}s are not registered with the school '${request.schoolId}'!`);
  }

  async registerUsers(request: IRegistrationAction, byUser: IUserToken) {
    this.authorize(byUser);
    validators.validateUserRegisteration(request);

    // Step 1: validated user registeration against school
    await this.validateUsersInSchool(request);
    const dbSchool = await this.schoolsRepo.findById(request.schoolId);
    if (!dbSchool) throw new InvalidRequestError(`Invalid schoolId ${request.schoolId}`);
    switch (request.action) {
      case 'approve':
        return this.approve(dbSchool, request);
      case 'reject':
        return this._commandsProcessor.sendCommand(Service.schools, this.doReject, request);
      case 'withdraw':
        return this._commandsProcessor.sendCommand(Service.schools, this.doWithdraw, request);
      default:
        throw new InvalidRequestError(`Unrecognized action ${request.action}!`);
    }
  }

  private approve(school: ISchool, request: IRegistrationAction) {
    // Step 2: valid license
    const currentDate = new Date();
    const usersKey = request.role + 's';
    const usersCount = request.users.length;
    if (!school.license || !school.license.isEnabled) throw new InvalidLicenseError(`No valid license for school ${school._id}`);

    // Step 3: License validity
    const isLicenseExpired = (school.license.validFrom < currentDate && school.license.validTo > currentDate);
    if (!isLicenseExpired) throw new InvalidLicenseError(`License has been expired for school ${school._id}`);

    // Step 3: License Quota
    const isQuotaAvailable = (school.license[usersKey].max - school.license[usersKey].consumed) > usersCount;
    if (!isQuotaAvailable) throw new InvalidLicenseError(`License quota is over for school ${school._id}`);

    return this._commandsProcessor.sendCommand(Service.schools, this.doApprove, request);
  }

  private async doApprove(request: IRegistrationAction) {
    const schoolsRepo = this._uow.getRepository(Repo.schools, true) as SchoolsRepository;
    const usersRepo = this._uow.getRepository(Repo.users, true) as UsersRepository;

    await schoolsRepo.consumeLicense(request.schoolId, request.role, request.users.length);
    await usersRepo.approveRegistrations(request.schoolId, request.users);

    await this._kafkaService.sendMany(config.kafkaUpdatesTopic, request.users.map(userId => ({
      event: Events.enrollment,
      data: {
        _id: userId,
        status: Status.active,
        schoolId: request.schoolId,
        courses: []
      },
      timestamp: Date.now(),
      v: '1.0.0'
    })));
  }

  private async doReject(request: IRegistrationAction) {
    // Step 2: remove user registeration
    await this.usersRepo.reject(request.schoolId, request.users);
    return { ok: 1 };
  }

  private async doWithdraw(request: IRegistrationAction) {
    const schoolsRepo = this._uow.getRepository(Repo.schools, true) as SchoolsRepository;
    const sectionsRepo = this._uow.getRepository(Repo.sections, true) as SectionsRepository;
    const coursesRepo = this._uow.getRepository(Repo.courses, true) as CoursesRepository;
    const usersRepo = this._uow.getRepository(Repo.users, true) as UsersRepository;

    await schoolsRepo.releaseLicense(request.schoolId, request.role, request.users.length);
    await sectionsRepo.removeStudents({ schoolId: request.schoolId }, request.users);

    const now = new Date();
    const courses = await coursesRepo.getActiveCoursesForUsers(request.role, request.users);
    await coursesRepo.finishUsersInCourses(courses.map(course => ({
      filter: { _id: course._id, schoolId: request.schoolId },
      usersIds: request.users
    })), request.role, now);

    await usersRepo.withdraw(request.schoolId, request.users);

    await this._kafkaService.sendMany(config.kafkaUpdatesTopic, request.users.map(userId => ({
      event: Events.enrollment,
      data: {
        _id: userId,
        status: Status.inactive,
        // tslint:disable-next-line: no-null-keyword
        schoolId: null,
        courses: []
      },
      timestamp: Date.now(),
      v: '1.0.0'
    })));
    await this._uow.commit();
  }

  async doSwitch(request: ISwitchRegistrationAction) {
    const schoolsRepo = this._uow.getRepository(Repo.schools, true) as SchoolsRepository;
    const sectionsRepo = this._uow.getRepository(Repo.sections, true) as SectionsRepository;
    const coursesRepo = this._uow.getRepository(Repo.courses, true) as CoursesRepository;
    const usersRepo = this._uow.getRepository(Repo.users, true) as UsersRepository;

    await schoolsRepo.releaseLicense(request.fromSchoolId, request.role, request.users.length);
    await sectionsRepo.removeStudents({ schoolId: request.fromSchoolId }, request.users);

    const now = new Date();
    const courses = await coursesRepo.getActiveCoursesForUsers(request.role, request.users);
    await coursesRepo.finishUsersInCourses(courses.map(course => ({
      filter: { _id: course._id, schoolId: request.fromSchoolId },
      usersIds: request.users
    })), request.role, now);

    await usersRepo.withdraw(request.fromSchoolId, request.users);

    await schoolsRepo.consumeLicense(request.toSchoolId, request.role, request.users.length);
    await usersRepo.approveRegistrations(request.toSchoolId, request.users);

    await this._kafkaService.sendMany(config.kafkaUpdatesTopic, request.users.map(userId => ({
      event: Events.enrollment,
      data: {
        _id: userId,
        status: Status.active,
        // tslint:disable-next-line: no-null-keyword
        schoolId: request.toSchoolId,
        courses: []
      },
      timestamp: Date.now(),
      v: '1.0.0'
    })));
    await this._uow.commit();
  }

  private async doUpdateUsers(schoolId: string, users: ISchoolUserPermissions[]) {
    return this.schoolsRepo.updateUsersPermission(schoolId, users);
  }

  async deleteUsers(updateObjs: { users: string[] }, schoolId: string, byUser: IUserToken) {
    this.authorize(byUser);
    validators.validateDeleteSchoolUsers(updateObjs);
    return this._commandsProcessor.sendCommand(Service.schools, this.doDeleteUsers, schoolId, updateObjs.users);
  }

  private async doDeleteUsers(schoolId: string, usersIds: string[]) {
    return this.schoolsRepo.deleteUsersPermission(schoolId, usersIds);
  }

  async updateAcademicTerm(updateObj: IUpdateAcademicTermRequest, schoolId: string, byUser: IUserToken) {
    this.authorize(byUser);
    const academicTerm: IAcademicTerm = {
      _id: newAcademicTermId(),
      year: updateObj.year,
      term: updateObj.term,
      startDate: new Date(updateObj.startDate),
      endDate: new Date(updateObj.endDate),
      gracePeriod: updateObj.gracePeriod,
      isEnabled: updateObj.isEnabled
    };
    validators.validateUpdateSchoolAcademicTerm({ academicTerm });
    const school = await this.schoolsRepo.findOne({ _id: schoolId });
    if (!school) throw new InvalidRequestError(`Invalid schoolId ${schoolId}`);
    return this._commandsProcessor.sendCommand(Service.schools, this.doUpdateAcademicTerm, schoolId, updateObj, academicTerm);
  }

  private async doUpdateAcademicTerm(schoolId: string, updateObj: IUpdateAcademicTermRequest, academicTerm: IAcademicTerm) {
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
    return this._commandsProcessor.sendCommand(Service.schools, this.doDeleteAcademicTerm, schoolId, academicTermId);
  }

  private async doDeleteAcademicTerm(schoolId: string, academicTermId: string) {
    return this.schoolsRepo.deleteAcademicTerm(schoolId, academicTermId);
  }

  async patch(updateObj: IUpdateSchoolRequest, schoolId: string, byUser: IUserToken) {
    this.authorize(byUser);
    if (!updateObj) throw new InvalidRequestError('Request should not be empty!');
    validators.validateUpdateSchool(updateObj);
    return this._commandsProcessor.sendCommand(Service.schools, this.doPatch, schoolId, updateObj);
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
    const school = await this.schoolsRepo.findOne({ _id: schoolId });
    if (!school) throw new InvalidRequestError(`Invalid schoolId ${schoolId}`);
    if (school.license && school.license.validTo > license.validTo) throw new InvalidRequestError('ValidTo conflicts with existing license validTo date, validTo should be greater');
    return this._commandsProcessor.sendCommand(Service.schools, this.doPatchLicense, schoolId, license);
  }

  private async doPatchLicense(schoolId: string, updateObj: ILicense) {
    return this.schoolsRepo.patch({ _id: schoolId }, { license: updateObj });
  }

  protected authorize(byUser: IUserToken) {
    if (!byUser) throw new ForbiddenError('access token is required!');
    if (byUser.role.includes(config.authorizedRole)) return true;
    throw new UnauthorizedError('you are not authorized to do this action');
  }
  async doAddMany(schools: ISchool[]) {
    return this.schoolsRepo.addMany(schools, false);
  }
}
