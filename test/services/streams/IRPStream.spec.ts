import 'mocha';
import sinon from 'sinon';
import chai, { expect } from 'chai';
chai.use(require('sinon-chai'));

import { IRPStream } from '../../../src/services/streams/IRPStream';
import { KafkaStreams } from 'kafka-streams';
import { IAppEvent } from '../../../src/models/events/IAppEvent';
import { UsersService } from '../../../src/services/UsersService';

const testEvent: IAppEvent = { data: [], event: '', timestamp: Date.now(), v: '1.0', key: 'abc' };
const kafkaStreamsStub = sinon.spy(() => sinon.createStubInstance(KafkaStreams));
const userServiceStub = sinon.spy(() => sinon.createStubInstance(UsersService));

describe('IRP Stream', () => {
  let _kafkaStreamsStub: any;
  let _userServiceStub: any;
  let irpStream: IRPStream;

  beforeEach(() => {
    _kafkaStreamsStub = new kafkaStreamsStub();
    _userServiceStub = new userServiceStub();
  });

  it('should succeed to instantiate a new IRPStream object', async () => {
    irpStream = new IRPStream(_kafkaStreamsStub, () => _userServiceStub);
    expect(irpStream).instanceOf(IRPStream);
  });

  it('should succeed to not process an event without data', async () => {
    // tslint:disable-next-line: no-string-literal
    const result = await irpStream['processMessage'](<any>{ value: { ...testEvent, data: undefined } });
    expect(result).equal(undefined);
  });

  it('should succeed to not process an event with unknown method', async () => {
    // tslint:disable-next-line: no-string-literal
    const result = await irpStream['processMessage'](<any>{ value: { ...testEvent, event: 'unknown_method' } });
    expect(result).equal(undefined);
  });

  it('should succeed to call signupOrUpdate method if event is "user_created" or "user_updated"', async () => {
    const done: any[] = [];
    _userServiceStub.signupOrUpdate = () => done.push(true);
    // tslint:disable-next-line: no-string-literal
    await irpStream['processMessage'](<any>{ value: { ...testEvent, event: 'user_created' } });
    // tslint:disable-next-line: no-string-literal
    await irpStream['processMessage'](<any>{ value: { ...testEvent, event: 'user_updated' } });
    expect(done).to.have.lengthOf(2);
  });

  it('should succeed to not process an event with unknown method', async () => {
    _userServiceStub.signupOrUpdate = () => { throw 500; };
    // tslint:disable-next-line: no-string-literal
    const result = await irpStream['processMessage'](<any>{ value: { ...testEvent, event: 'user_updated' } });
    expect(result && JSON.parse(result.value).error).equal('500');
  });
});
