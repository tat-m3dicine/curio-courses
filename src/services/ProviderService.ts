import config from '../config';
import validators from '../utils/validators';
import generate from 'nanoid/non-secure/generate';
import { IProvider, IAcademicTermRequest } from '../models/entities/IProvider';
import { ICreateProviderRequest } from '../models/requests/IProviderRequest';
import { CommandsProcessor } from './CommandsProcessor';
import { IUnitOfWork, defaultPaging } from '@saal-oryx/unit-of-work';
import { ProvidersRepository } from '../repositories/ProvidersRepository';
import { ForbiddenError } from '../exceptions/ForbiddenError';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';
import { ConditionalBadRequest } from '../exceptions/ConditionalBadRequest';
import { UsersRepository } from '../repositories/UsersRepository';
import { validateAllObjectsExist } from '../utils/validators/AllObjectsExist';
import nanoid = require('nanoid');
import { IAcademicTerm } from '../models/entities/Common';
import { IUserToken } from '../models/IUserToken';

export class ProvidersService {

  constructor(protected _uow: IUnitOfWork, protected _commandsProcessor: CommandsProcessor) {
  }

  protected get providersRepo() {
    return this._uow.getRepository('Providers') as ProvidersRepository;
  }

//   async get(schoolId: string, byUser: IUserToken) {
//     this.authorize(byUser);
//     return this.schoolsRepo.findById(schoolId);
//   }

//   async delete(schoolId: string, byUser: IUserToken) {
//     this.authorize(byUser);
//     return this._commandsProcessor.sendCommand('schools', this.doDelete, schoolId);
//   }

//   private async doDelete(schoolId: string) {
//     return this.schoolsRepo.delete({ _id: schoolId });
//   }

//   async list(paging = defaultPaging, byUser: IUserToken) {
//     this.authorize(byUser);
//     return this.schoolsRepo.findManyPage({}, paging);
//   }

  async add(createObj: ICreateProviderRequest) {
    validators.validateCreateProvider(createObj);
    const academicTerms: IAcademicTerm[] = [];
    if (createObj.academicTerm) {
     academicTerms.push({
        _id: generate('0123456789abcdef', 10),
       ...createObj.academicTerm
    });
    }

     const provider: IProvider = {
      _id: createObj._id,
      config: createObj.config,
      package: createObj.package,
      academicTerms
    };
    return this.providersRepo.add(provider);
  }

//   async update(updateObj: IUpdateSchoolRequest, schoolId: string, byUser: IUserToken) {
//     this.authorize(byUser);
//     validators.validateUpdateSchool(updateObj);
//     return this._commandsProcessor.sendCommand('schools', this.doUpdate, schoolId, updateObj);
//   }

//   private async doUpdate(schoolId: string, updateObj: IUpdateSchoolRequest) {
//     return this.schoolsRepo.update({ _id: schoolId }, { $set: updateObj });
//   }

  async updateAcademicTerm(updateObj: IAcademicTermRequest, providerId: string, byUser: IUserToken) {
    //this.authorize(byUser);
    const academicTerm: IAcademicTerm = {
      _id: generate('0123456789abcdef', 10),
      year: updateObj.year,
      term: updateObj.term,
      startDate: new Date(updateObj.startDate),
      endDate: new Date(updateObj.endDate),
      gracePeriod: updateObj.gracePeriod,
      isEnabled: updateObj.isEnabled
    };
    validators.validateUpdateProviderAcademicTerm({ academicTerm });
    if (academicTerm.startDate > academicTerm.endDate) throw new InvalidRequestError('Start Date should be less than End Date');
    const result = await this.providersRepo.updateAcademicTerm(providerId, updateObj, academicTerm);
return result;
  }

  private authorize(byUser: IUserToken) {
    if (!byUser) throw new ForbiddenError('access token is required!');
    const isAuthorized = byUser.role.split(',').includes(config.authorizedRole);
    if (!isAuthorized) throw new UnauthorizedError('you are not authorized!');
  }

//   private async doUpdateAcademicTerm(schoolId: string, updateObj: IAcademicTermRequest, academicTerm: IAcademicTerm) {
//     return this.schoolsRepo.updateAcademicTerm(schoolId, updateObj, academicTerm);
//   }

//   async deleteAcademicTerm(requestParams: IDeleteAcademicTermRequest, byUser: IUserToken) {
//     this.authorize(byUser);
//     const { _id: schoolId, academicTermId } = { ...requestParams };
//     const activeCourses = await this.coursesRepo.findMany({ 'academicTerm._id': academicTermId });
//     if (activeCourses.length !== 0) {
//       const coursesIds = activeCourses.map(course => course._id).join("', '");
//       throw new ConditionalBadRequest(`Unable to delete the Academic Term because ['${coursesIds}'] are active within.`);
//     }
//     return this._commandsProcessor.sendCommand('schools', this.doDeleteAcademicTerm, schoolId, academicTermId);
//   }

//   private async doDeleteAcademicTerm(schoolId: string, academicTermId: string) {
//     return this.schoolsRepo.deleteAcademicTerm(schoolId, academicTermId);
//   }

//   async patch(updateObj: IUpdateSchoolRequest, schoolId: string, byUser: IUserToken) {
//     this.authorize(byUser);
//     if (!updateObj) throw new InvalidRequestError('Request should not be empty!');
//     validators.validateUpdateSchool(updateObj);
//     return this._commandsProcessor.sendCommand('schools', this.doPatch, schoolId, updateObj);
//   }

//   private async doPatch(schoolId: string, updateObj: IUpdateSchoolRequest) {
//     return this.schoolsRepo.patch({ _id: schoolId }, updateObj);
//   }

//   async patchLicense(licenseObj: ICreateLicenseRequest, schoolId: string, byUser: IUserToken) {
//     this.authorize(byUser);
//     validators.validateCreateLicense(licenseObj);
//     const { grades, features = [], signupMethods = [] } = licenseObj.package;
//     const license: ILicenseRequest = {
//       students: { max: licenseObj.students },
//       teachers: { max: licenseObj.teachers },
//       isEnabled: licenseObj.isEnabled,
//       validFrom: new Date(),
//       validTo: new Date(licenseObj.validTo),
//       reference: licenseObj.reference || byUser.sub,
//       package: { grades, features, signupMethods }
//     };
//     /**
//      * If validTo is less than existing license validTo
//      */
//     const isLicenseConflicts = await this.schoolsRepo.findOne({ '_id': schoolId, 'license.validTo': { $gt: license.validTo } });
//     if (isLicenseConflicts) throw new InvalidRequestError('ValidTo conflicts with existing license validTo date, validTo should be greater');
//     return this._commandsProcessor.sendCommand('schools', this.doPatchLicense, schoolId, license);
//   }

//   private async doPatchLicense(schoolId: string, updateObj: ILicense) {
//     return this.schoolsRepo.patch({ _id: schoolId }, { license: updateObj });
//   }

//   private authorize(byUser: IUserToken) {
//     if (!byUser) throw new ForbiddenError('access token is required!');
//     const isAuthorized = byUser.role.split(',').includes(config.authorizedRole);
//     if (!isAuthorized) throw new UnauthorizedError('you are not authorized!');
//   }

//   private newSchoolId(name: string) {
//     return `${name.toLocaleLowerCase().replace(/\s/g, '')}_${generate('0123456789abcdef', 5)}`;
//   }

//   async doAddMany(schools: ISchool[]) {
//     return this.schoolsRepo.addMany(schools, false);
//   }
}
