import 'mocha';
import sinon from 'sinon';
import chai from 'chai';
chai.use(require('sinon-chai'));
const expect = chai.expect;

import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { SchoolsService } from '../../src/services/SchoolsService';
import { Repo } from '../../src/repositories/RepoNames';
import { IUserToken } from '../../src/models/IUserToken';
import config from '../../src/config';
import { schoolRequest } from '../mockData/getTestData';
import { KafkaService } from '../../src/services/processors/KafkaService';
import { CommandsProcessor } from '../../src/services/processors/CommandsProcessor';

const unitOfWorkStub = sinon.spy(() => sinon.createStubInstance(UnitOfWork));
const kafkaServiceStub = sinon.spy(() => sinon.createStubInstance(KafkaService));
const commandsProcessorStub = sinon.spy(() => sinon.createStubInstance(CommandsProcessor));

// tslint:disable-next-line: no-big-function
describe('Schools Service', () => {
  let _unitOfWorkStub: any;
  let _kafkaServiceStub: any;
  let _commandsProcessorStub: any;
  let schoolService: SchoolsService;
  const repositoryReturns = (repo: Repo, methods: object) => _unitOfWorkStub.getRepository.withArgs(repo, true).returns(methods);

  beforeEach(() => {
    _unitOfWorkStub = new unitOfWorkStub();
    _kafkaServiceStub = new kafkaServiceStub();
    _commandsProcessorStub = new commandsProcessorStub();
    schoolService = new SchoolsService(_unitOfWorkStub, _commandsProcessorStub, _kafkaServiceStub);
    repositoryReturns(Repo.users, { addRegisteration: () => undefined });
    repositoryReturns(Repo.courses, { getActiveCoursesForUsers: () => [] });
  });

  it('should able to create the school, with valid request', async () => {
    _commandsProcessorStub.sendCommand.resolves({ result: { done: true } });
    await schoolService.add(schoolRequest, <IUserToken>{ role: [config.authorizedRole] });
  });

});
