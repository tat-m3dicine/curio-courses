import { KafkaService } from './KafkaService';
import config from '../config';
import { IUserUpdatedEvent } from '../models/events/IUserUpdatedEvent';
export class UpdatesProcessor {

  constructor(protected _kafkaService: KafkaService) { }

  async sendEnrollmentUpdates(usersUpdates: IUserUpdatedEvent[], coursesIds: string[]) {
    const events: IUserUpdatedEvent[] = [];
    for (const userUpdate of usersUpdates) {
      events.push({
        event: Events[userUpdate.event],
        data: {
          ...userUpdate.data,
          courses: userUpdate.data.courses.filter(course => coursesIds.includes(course._id))
        }
      });
      events.push({
        isState: true,
        event: Events.enrollment,
        data: userUpdate.data
      });
    }
    this.sendManyUpdates(events);
  }

  async sendUpdate(userUpdate: IUserUpdatedEvent) {
    await this.sendManyUpdates([userUpdate]);
  }

  async sendManyUpdates(usersUpdates: IUserUpdatedEvent[]) {
    const now = Date.now();
    const events = usersUpdates.map(userUpdate => ({
      key: userUpdate.isState ? userUpdate.data._id : undefined,
      event: userUpdate.event,
      data: userUpdate.data,
      timestamp: now,
      v: '1.0.0'
    }));
    await this._kafkaService.sendMany(config.kafkaUpdatesTopic, events);
  }
}

enum Events {
  enroll = 'user_enrolled',
  drop = 'user_dropped',
  enrollment = 'user_enrollment'
}