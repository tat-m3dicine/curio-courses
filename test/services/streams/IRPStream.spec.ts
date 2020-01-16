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

  it('should succeed to call signup method if event it "user_created"', async () => {
    let done = false;
    _userServiceStub.signup = () => done = true;
    // tslint:disable-next-line: no-string-literal
    await irpStream['processMessage'](<any>{ value: { ...testEvent, event: 'user_created' } });
    expect(done).equal(true);
  });

  it('should succeed to call signup method if event it "user_updated"', async () => {
    let done = false;
    _userServiceStub.update = () => done = true;
    // tslint:disable-next-line: no-string-literal
    await irpStream['processMessage'](<any>{ value: { ...testEvent, event: 'user_updated' } });
    expect(done).equal(true);
  });

  it('should succeed to not process an event with unknown method', async () => {
    _userServiceStub.update = () => { throw 500; };
    // tslint:disable-next-line: no-string-literal
    const result = await irpStream['processMessage'](<any>{ value: { ...testEvent, event: 'user_updated' } });
    expect(result && JSON.parse(result.value).error).equal('500');
  });
});
