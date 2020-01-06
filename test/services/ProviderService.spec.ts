import 'mocha';
import sinon from 'sinon';
import chai from 'chai';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
chai.use(require('sinon-chai'));
const expect = chai.expect;

import config from '../../src/config';
import { Repo } from '../../src/repositories/RepoNames';
import { NotFoundError } from '../../src/exceptions/NotFoundError';
import { ProvidersService } from '../../src/services/ProviderService';
import { ValidationError } from '../../src/exceptions/ValidationError';
import { InvalidRequestError } from '../../src/exceptions/InvalidRequestError';
import { ConditionalBadRequest } from '../../src/exceptions/ConditionalBadRequest';
import { UpdatesProcessor } from '../../src/services/UpdatesProcessor';
import { CommandsProcessor } from '../../src/services/CommandsProcessor';
import { IUserToken } from '../../src/models/IUserToken';
import { ICreateProviderRequest } from '../../src/models/requests/IProviderRequest';
import { getTestData, Test } from '../getTestData';
import { IAcademicTerm } from '../../src/models/entities/Common';
import { IUpdateAcademicTermRequest } from '../../src/models/requests/ISchoolRequests';
import { IDeleteProviderAcademicTermRequest, IProvider } from '../../src/models/entities/IProvider';
import { ICourse } from '../../src/models/entities/ICourse';


const unitOfWorkStub = sinon.spy(() => sinon.createStubInstance(UnitOfWork));
const updatesProcessorStub = sinon.spy(() => sinon.createStubInstance(UpdatesProcessor));
const commandsProcessorStub = sinon.spy(() => sinon.createStubInstance(CommandsProcessor));
const token = <IUserToken>{ role: [config.authorizedRole] };
const activeCourses: ICourse = getTestData(Test.activeCourses, {}, false);
const request: ICreateProviderRequest = getTestData(Test.providerRequest, {}, false);
const providerObj: IProvider = getTestData(Test.providerObj, {}, false);
const updateProviderRequest: IUpdateAcademicTermRequest = getTestData(Test.updateProviderRequest, {}, false);
const updateProviderResponse: IUpdateAcademicTermRequest = getTestData(Test.updateProviderResponse, {}, false);
const deleteAcademicProviderResponse: any = getTestData(Test.deleteAcademicProviderResponse, {}, false);
const deleteAcademicTermProviderRequest: IDeleteProviderAcademicTermRequest = getTestData(Test.deleteAcademicTermProviderRequest, {}, false);
const dateValidationUpdateProviderRequest: IUpdateAcademicTermRequest = getTestData(Test.dateValidationUpdateProviderRequest, {}, false);

describe('Providers Service', () => {
  let _unitOfWorkStub: any;
  let _updatesProcessorStub: any;
  let _commandsProcessorStub: any;
  let _providersService: ProvidersService;
  const repositoryReturns = (repo: Repo, methods: object) => _unitOfWorkStub.getRepository.withArgs(repo).returns(methods);
  beforeEach(() => {
    _unitOfWorkStub = new unitOfWorkStub();
    _updatesProcessorStub = new updatesProcessorStub();
    _commandsProcessorStub = new commandsProcessorStub();
    _providersService = new ProvidersService(_unitOfWorkStub, _commandsProcessorStub);
    _commandsProcessorStub.sendCommand = (service, method, ...args) => _providersService[method.name](...args);
  });

  it('should fail to create provider due to validation errors', async () => {
   try {
       await _providersService.add(<ICreateProviderRequest>{});
    } catch (error) {
      expect(error).instanceOf(ValidationError);
    }
  });

  it('should create provider with success response', async () => {
    repositoryReturns(Repo.providers, { add: () => request });
    const result = await _providersService.add(request);
    expect(result).equal(request);
  });

  it('should fail to update academicterm provider due to validation errors', async () => {
    try {
      await _providersService.updateAcademicTerm(<IUpdateAcademicTermRequest>{}, '123', token);
    } catch (error) {
      expect(error).instanceOf(ValidationError);
    }
  });

  it('should fail to update academicterm provider due to invalidProviderRequest errors', async () => {
    try {
      await _providersService.updateAcademicTerm(dateValidationUpdateProviderRequest, '123', token);
    } catch (error) {
      expect(error).instanceOf(InvalidRequestError);
    }
  });

  it('should update academicterm provider with success response', async () => {
    repositoryReturns(Repo.providers, { updateAcademicTerm: () => updateProviderResponse });
    const result = await _providersService.updateAcademicTerm(updateProviderRequest, '123', token);
     expect(result).equal(updateProviderResponse);
  });

  it('should fail to delete academicterm provider with success response', async () => {

      repositoryReturns(Repo.courses, { findMany: () => [] });
      repositoryReturns(Repo.providers, { deleteAcademicTermProvider: () => deleteAcademicProviderResponse});
     const result =  await _providersService.deleteAcademicTermProvider(deleteAcademicTermProviderRequest, token);
     expect(result).equal(deleteAcademicProviderResponse);
  });

  it('should fail to delete academicterm provider due to dependency of academicTerm errors', async () => {
    try {
        repositoryReturns(Repo.courses, { findMany: () => [activeCourses] });
      await _providersService.deleteAcademicTermProvider(deleteAcademicTermProviderRequest, token);
    } catch (error) {
      expect(error).instanceOf(ConditionalBadRequest);
    }
  });

  it('should delete provider with NotFoundError', async () => {
    try {
    repositoryReturns(Repo.providers, { findById: () => {} });
    await _providersService.deleteProvider('123', token);
    } catch (error) {
        expect(error).instanceOf(NotFoundError);
    }
  });

  it('should delete provider as there is no dependency of academic terms in courses', async () => {
    repositoryReturns(Repo.providers, { findById: () => providerObj, delete: () => deleteAcademicProviderResponse });
    repositoryReturns(Repo.courses, { findMany: () => [] });
     const result =  await _providersService.deleteProvider('123', token);
    expect(result).equal(deleteAcademicProviderResponse);
  });

});