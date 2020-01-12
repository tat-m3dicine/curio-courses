import 'mocha';
import sinon from 'sinon';
import chai, { expect } from 'chai';
chai.use(require('sinon-chai'));

import { IRPStream } from '../../../src/services/streams/IRPStream';
import { KafkaStreams } from 'kafka-streams';
import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { IAppEvent } from '../../../src/models/events/IAppEvent';
import { UsersService } from '../../../src/services/UsersService';
import { getKStreamMock } from './KStreamMock';
import { UpdatesProcessor } from '../../../src/services/processors/UpdatesProcessor';

const testEvent: IAppEvent = { data: [], event: '', timestamp: Date.now(), v: '1.0', key: 'abc' };
const unitOfWorkStub = sinon.spy(() => sinon.createStubInstance(UnitOfWork));
const userServiceStub = sinon.spy(() => sinon.createStubInstance(UsersService));
const kafkaStreamsStub = sinon.spy(() => sinon.createStubInstance(KafkaStreams));
const updatesProcessorStub = sinon.spy(() => sinon.createStubInstance(UpdatesProcessor));

describe('IRP Stream', () => {
  let _unitOfWorkStub: any;
  let _kafkaStreamsStub: any;
  let _updatesProcessorStub: any;
  let _userServiceStub: any;
  let irpStream: IRPStream;

  const getIRPStream = (events: IAppEvent[], failedEvents?: IAppEvent[]) => {
    _kafkaStreamsStub.getKStream = getKStreamMock(events, failedEvents);
    return new IRPStream(
      _kafkaStreamsStub,
      _updatesProcessorStub,
      () => _unitOfWorkStub,
      () => _userServiceStub,
      { writeToFailedDelay: 5 }
    );
  };

  beforeEach(() => {
    _unitOfWorkStub = new unitOfWorkStub();
    _userServiceStub = new userServiceStub();
    _kafkaStreamsStub = new kafkaStreamsStub();
    _updatesProcessorStub = new updatesProcessorStub();
  });

  it('should succeed to run streams with no events', async () => {
    irpStream = getIRPStream([], []);
    const result = await irpStream.start();
    expect(result).deep.equal([[], []]);
  });

  it('should fail to process events due to no data payload', async () => {
    const event: IAppEvent = { ...testEvent, data: undefined };
    irpStream = getIRPStream([event]);
    const [stream] = await irpStream.start();
    expect(stream).deep.equal([undefined]);
  });

  it('should fail to process event due to users service not found', async () => {
    _kafkaStreamsStub.getKStream = getKStreamMock([testEvent]);
    irpStream = new IRPStream(_kafkaStreamsStub, _updatesProcessorStub, () => _unitOfWorkStub, () => <any>undefined);
    const [stream] = await irpStream.start();
    expect(stream).deep.equal([undefined]);
  });

  it('should succeed to process event "user_created" and call signup()', async () => {
    let done = false;
    _userServiceStub.signup = () => done = true;
    const event: IAppEvent = { ...testEvent, event: 'user_created' };
    irpStream = getIRPStream([event]);
    await irpStream.start();
    expect(done).equal(true);
  });

  it('should succeed to process event "user_updated" and call update()', async () => {
    let done = false;
    _userServiceStub.update = () => done = true;
    const event: IAppEvent = { ...testEvent, event: 'user_updated' };
    irpStream = getIRPStream([event]);
    await irpStream.start();
    expect(done).equal(true);
  });

  it('should fail to process event due to service signup() call error', async () => {
    _userServiceStub.signup = () => { throw 500; };
    const event: IAppEvent = { ...testEvent, event: 'user_created' };
    irpStream = getIRPStream([event]);
    const [stream] = await irpStream.start();
    expect(JSON.parse(stream[0].value).error).equal('500');
  });

  it('should succeed to process filed event even if event name was not found', async () => {
    const event: IAppEvent = { ...testEvent, event: 'notfoundevent' };
    irpStream = getIRPStream([], [event]);
    await irpStream.start();
  });
});
