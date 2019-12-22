import config from '../config';
import validators from '../utils/validators';
import generate from 'nanoid/non-secure/generate';
import { IProvider, IAcademicTermRequest, IDeleteProviderAcademicTermRequest } from '../models/entities/IProvider';
import { ICreateProviderRequest } from '../models/requests/IProviderRequest';
import { CommandsProcessor } from './CommandsProcessor';
import { IUnitOfWork, defaultPaging } from '@saal-oryx/unit-of-work';
import { ProvidersRepository } from '../repositories/ProvidersRepository';
import { ForbiddenError } from '../exceptions/ForbiddenError';
import { UnauthorizedError } from '../exceptions/UnauthorizedError';
import { InvalidRequestError } from '../exceptions/InvalidRequestError';
import { IAcademicTerm } from '../models/entities/Common';
import { IUserToken } from '../models/IUserToken';
import { ConditionalBadRequest } from '../exceptions/ConditionalBadRequest';

export class ProvidersService {

  constructor(protected _uow: IUnitOfWork, protected _commandsProcessor: CommandsProcessor) {
  }

  protected get providersRepo() {
    return this._uow.getRepository('Providers') as ProvidersRepository;
  }

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
    return this._commandsProcessor.sendCommand('providers', this.doAdd, provider);
  }

  private async doAdd(provider: IProvider) {
    return this.providersRepo.add(provider);
  }

  async updateAcademicTerm(updateObj: IAcademicTermRequest, providerId: string, byUser: IUserToken) {
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
    validators.validateUpdateProviderAcademicTerm({ academicTerm });
    if (academicTerm.startDate > academicTerm.endDate) throw new InvalidRequestError('Start Date should be less than End Date');
    return this._commandsProcessor.sendCommand('providers', this.doUpdateAcademicTerm, providerId, updateObj, academicTerm);
  }

  private async doUpdateAcademicTerm(providerId: string, updateObj: IAcademicTermRequest, academicTerm: IAcademicTerm) {
    return this.providersRepo.updateAcademicTerm(providerId, updateObj, academicTerm);
  }


  async deleteAcademicTermProvider(requestParams: IDeleteProviderAcademicTermRequest, byUser: IUserToken) {
    this.authorize(byUser);
    const { _id: providerId, academicTermId } = { ...requestParams };
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

  private authorize(byUser: IUserToken) {
    if (!byUser) throw new ForbiddenError('access token is required!');
    const isAuthorized = byUser.role.split(',').includes(config.authorizedRole);
    if (!isAuthorized) throw new UnauthorizedError('you are not authorized!');
  }
}
