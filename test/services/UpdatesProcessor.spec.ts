import 'mocha';
import sinon from 'sinon';
import chai, { expect } from 'chai';
chai.use(require('sinon-chai'));

import { KafkaService } from '../../src/services/KafkaService';
import { UpdatesProcessor } from '../../src/services/UpdatesProcessor';
import { IUserUpdatedData } from '../../src/models/events/IUserUpdatedEvent';

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

  it('should succeed to send enrollment updates with actions', async () => {
    updatesProcessor.sendEnrollmentUpdatesWithActions([{
      data: <IUserUpdatedData>{ _id: 'user', courses: [{ _id: 'course1' }, { _id: 'course2' }] },
      event: 'enroll',
    }], ['course1']);
    expect(kafkaEvents).to.have.lengthOf(2);
  });

  it('should succeed to send enrollment updates', async () => {
    updatesProcessor.sendEnrollmentUpdates([
      <IUserUpdatedData>{ _id: 'user', courses: [{ _id: 'course1' }] }
    ]);
    expect(kafkaEvents).to.have.lengthOf(1);
  });
});
