import 'mocha';
import sinon from 'sinon';
import chai, { expect } from 'chai';
chai.use(require('sinon-chai'));

import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { CommandsProcessor, KafkaService } from '@saal-oryx/event-sourcing';
import { UpdatesProcessor } from '../../src/services/processors/UpdatesProcessor';
import { getFactory } from '../../src/services/serviceFactory';
import { Service } from '../../src/models/ServiceName';
import { tryAndExpect } from '../tryAndExpect';

const unitOfWorkStub = sinon.spy(() => sinon.createStubInstance(UnitOfWork));
const kafkaServiceStub = sinon.spy(() => sinon.createStubInstance(KafkaService));
const updatesProcessorStub = sinon.spy(() => sinon.createStubInstance(UpdatesProcessor));
const commandsProcessorStub = sinon.spy(() => sinon.createStubInstance(CommandsProcessor));

describe('Stream Processor', () => {
  let _unitOfWorkStub: any;
  let _kafkaServiceStub: any;
  let _updatesProcessorStub: any;
  let _commandsProcessorStub: any;
  let serviceFactory: (name) => any;

  before(() => {
    _unitOfWorkStub = () => new unitOfWorkStub();
    _kafkaServiceStub = new kafkaServiceStub();
    _updatesProcessorStub = new updatesProcessorStub();
    _commandsProcessorStub = new commandsProcessorStub();
    serviceFactory = getFactory(_unitOfWorkStub, _commandsProcessorStub, _kafkaServiceStub, _updatesProcessorStub);
  });

  it('should succeed to get new instance of all service', async () => {
    const results = await Promise.all([
      serviceFactory(Service.schools),
      serviceFactory(Service.sections),
      serviceFactory(Service.courses),
      serviceFactory(Service.inviteCodes),
      serviceFactory(Service.providers)
    ]);
    results.map(service => expect(service.dispose).not.equal(undefined));
  });

  it('should succeed to call service dispose function (IService)', async () => {
    const service = await serviceFactory(Service.schools);
    expect(await service.dispose()).equal(undefined);
  });

  it('should fail to return a service instanse if name not found', async () => {
    await tryAndExpect(() => serviceFactory('not_found_service'), Error);
  });
});