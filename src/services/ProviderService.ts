import config from '../config';
import validators from '../utils/validators';
import generate from 'nanoid/non-secure/generate';
import { IProvider, IAcademicTermRequest, IDeleteProviderAcademicTermRequest } from '../models/entities/IProvider';
import { ICreateProviderRequest } from '../models/requests/IProviderRequest';
import { CommandsProcessor } from './CommandsProcessor';
import { IUnitOfWork } from '@saal-oryx/unit-of-work';
import { ProvidersRepository } from '../repositories/ProvidersRepository';
import { ForbiddenError } from '../exceptions/ForbiddenError';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';
import { IAcademicTerm } from '../models/entities/Common';
import { IUserToken } from '../models/IUserToken';
import { ConditionalBadRequest } from '../exceptions/ConditionalBadRequest';
import { IUpdateAcademicTermRequest } from '../models/requests/ISchoolRequests';
import { newProviderId, newAcademicTermId } from '../utils/IdGenerator';
import { Repo } from '../repositories/RepoNames';

export class ProvidersService {

  constructor(protected _uow: IUnitOfWork, protected _commandsProcessor: CommandsProcessor) {
  }

  protected get providersRepo() {
    return this._uow.getRepository(Repo.providers) as ProvidersRepository;
  }

  async add(createObj: ICreateProviderRequest) {
    validators.validateCreateProvider(createObj);
    const academicTerms: IAcademicTerm[] = [];
    if (createObj.academicTerm) {
      academicTerms.push({
        _id: newProviderId(),
        ...createObj.academicTerm
      });
    }

    const provider: IProvider = {
      _id: createObj._id,
      config: createObj.config,
      license: createObj.license,
      location: createObj.location,
      academicTerms
    };
    return this._commandsProcessor.sendCommand('providers', this.doAdd, provider);
  }

  private async doAdd(provider: IProvider) {
    return this.providersRepo.add(provider);
  }

  async updateAcademicTerm(updateObj: IUpdateAcademicTermRequest, providerId: string, byUser: IUserToken) {
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
    validators.validateUpdateProviderAcademicTerm({ academicTerm });
    if (academicTerm.startDate > academicTerm.endDate) throw new InvalidRequestError('Start Date should be less than End Date');
    return this._commandsProcessor.sendCommand('providers', this.doUpdateAcademicTerm, providerId, updateObj, academicTerm);
  }

  private async doUpdateAcademicTerm(providerId: string, updateObj: IAcademicTermRequest, academicTerm: IAcademicTerm) {
    return this.providersRepo.updateAcademicTerm(providerId, updateObj, academicTerm);
  }


  async deleteAcademicTermProvider(requestParams: IDeleteProviderAcademicTermRequest, byUser: IUserToken) {
    this.authorize(byUser);
    const {  providerId, academicTermId } = { ...requestParams };
    const activeCourses = await this.providersRepo.findMany({ 'academicTerm._id': academicTermId });
    if (activeCourses.length !== 0) {
      const coursesIds = activeCourses.map(course => course._id).join("', '");
      throw new ConditionalBadRequest(`Unable to delete the Academic Term because ['${coursesIds}'] are active within.`);
    }
    return this._commandsProcessor.sendCommand('providers', this.doDeleteAcademicTermProvider, providerId, academicTermId);
  }

  private async doDeleteAcademicTermProvider(_id: string, academicTermId: string) {
    return this.providersRepo.deleteAcademicTermProvider(_id, academicTermId);
  }

  async get(providerId: string, byUser: IUserToken) {
    this.authorize(byUser);
    return this.providersRepo.findById(providerId);
  }

  protected authorize(byUser: IUserToken) {
    if (!byUser) throw new ForbiddenError('access token is required!');
    if (byUser.role.includes(config.authorizedRole)) return true;
    throw new UnauthorizedError('you are not authorized to do this action');
  }
}
