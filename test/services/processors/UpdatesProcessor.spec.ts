import 'mocha';
import sinon from 'sinon';
import chai, { expect } from 'chai';
import { KafkaService } from '@saal-oryx/event-sourcing';
import { UpdatesProcessor, Events } from '../../../src/services/processors/UpdatesProcessor';
import { IUserUpdatedData } from '../../../src/models/events/IUserUpdatedEvent';
chai.use(require('sinon-chai'));

const kafkaServiceStub = sinon.spy(() => sinon.createStubInstance(KafkaService));

describe('Updates Processor', () => {
  let _kafkaServiceStub: any;
  let updatesProcessor: UpdatesProcessor;
  let kafkaEvents;

  beforeEach(() => {
    _kafkaServiceStub = new kafkaServiceStub();
    updatesProcessor = new UpdatesProcessor(_kafkaServiceStub);
    updatesProcessor.kafkaService.sendMany = <any>((_, events) => kafkaEvents = events);
  });

  it('should succeed to send enrollment updates with actions (event: enroll)', async () => {
    updatesProcessor.sendEnrollmentUpdatesWithActions([{
      data: <IUserUpdatedData>{ _id: 'user', courses: [{ _id: 'course1' }, { _id: 'course2' }] },
      event: 'enroll',
    }], ['course1']);
    expect(kafkaEvents).to.have.lengthOf(2);
  });

  it('should succeed to send enrollment updates with actions (event: drop)', async () => {
    updatesProcessor.sendEnrollmentUpdatesWithActions([{
      data: <IUserUpdatedData>{ _id: 'user', courses: [{ _id: 'course1' }, { _id: 'course2' }] },
      event: 'drop',
    }], ['course1']);
    expect(kafkaEvents).to.have.lengthOf(2);
  });

  it('should succeed to send enrollment updates with actions (event: other)', async () => {
    updatesProcessor.sendEnrollmentUpdatesWithActions([{
      data: <IUserUpdatedData>{ _id: 'user', courses: [{ _id: 'course1' }, { _id: 'course2' }] },
      event: 'other',
    }], ['course1']);
    expect(kafkaEvents).to.have.lengthOf(2);
  });

  it('should succeed to send enrollment updates', async () => {
    updatesProcessor.sendEnrollmentUpdates([
      <IUserUpdatedData>{ _id: 'user', courses: [{ _id: 'course1' }] }
    ]);
    expect(kafkaEvents).to.have.lengthOf(1);
  });

  it('should succeed in notifying course event (data not array)', async () => {
    let called = false;
    _kafkaServiceStub.sendMany = async () => { called = true; };
    await updatesProcessor.notifyCourseEvents(<any>'event', <any>{});
    expect(called).equal(true);
  });

  it('should succeed in notifying course event (array data)', async () => {
    let called = false;
    _kafkaServiceStub.sendMany = async () => { called = true; };
    await updatesProcessor.notifyCourseEvents(<any>'event', <any>[]);
    expect(called).equal(true);
  });


});
