import { KafkaService } from './KafkaService';
import config from '../config';
import { IUserUpdatedEvent } from '../models/events/IUserUpdatedEvent';
import { IAppEvent } from '../models/events/IAppEvent';
export class UpdatesProcessor {

  constructor(protected _kafkaService: KafkaService) { }

  async sendEnrollmentUpdates(usersUpdates: IUserUpdatedEvent[], coursesIds: string[]) {
    const now = Date.now();
    const events: IAppEvent[] = [];
    for (const userUpdate of usersUpdates) {
      events.push({
        event: Events[userUpdate.event],
        data: {
          ...userUpdate.data,
          courses: userUpdate.data.courses.filter(course => coursesIds.includes(course._id))
        },
        timestamp: now,
        v: '1.0.0'
      });
      events.push({
        key: userUpdate.data._id,
        event: Events.enrollment,
        data: userUpdate.data,
        timestamp: now,
        v: '1.0.0'
      });
    }
    await this._kafkaService.sendMany(config.kafkaUpdatesTopic, events);
  }
}

export enum Events {
  enroll = 'user_enrolled',
  drop = 'user_dropped',
  enrollment = 'user_enrollment'
}