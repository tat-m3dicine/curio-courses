import config from '../../config';
import { IUserUpdatedEvent, IUserUpdatedData, IUserCourseUpdates } from '../../models/events/IUserUpdatedEvent';
import { IAppEvent } from '../../models/events/IAppEvent';
import { KafkaService } from '@saal-oryx/event-sourcing';
import loggerFactory from '../../utils/logging';
import { ICourse } from '../../models/entities/ICourse';

export class UpdatesProcessor {

  constructor(protected _kafkaService: KafkaService) { }

  get kafkaService() {
    return this._kafkaService;
  }

  async sendEnrollmentUpdatesWithActions(usersUpdates: IUserUpdatedEvent[], enrolledCoursesIds: string[], droppedCoursesIds: string[] = []) {
    const now = Date.now();
    const events: IAppEvent[] = [];
    for (const userUpdate of usersUpdates) {
      let changedCourses: IUserCourseUpdates[] = [];
      let enrollmentCourses: IUserCourseUpdates[] = [];
      if (userUpdate.event === 'enroll') {
        enrollmentCourses = userUpdate.data.courses;
        changedCourses = enrollmentCourses.filter(course => enrolledCoursesIds.includes(course._id));
      } else if (userUpdate.event === 'drop') {
        enrollmentCourses = userUpdate.data.courses.filter(course => !droppedCoursesIds.includes(course._id));
        changedCourses = userUpdate.data.courses.filter(course => droppedCoursesIds.includes(course._id));
      }
      events.push({
        event: Events[userUpdate.event],
        data: { ...userUpdate.data, courses: changedCourses },
        timestamp: now,
        v: '1.0.0'
      });
      const userId = userUpdate.data._id;
      if (events.find(e => e.key === userId)) continue; // this left
      events.push({
        key: userId,
        event: Events.enrollment,
        data: { ...userUpdate.data, courses: enrollmentCourses },
        timestamp: now,
        v: '1.0.0'
      });
    }
    await this._kafkaService.sendMany(config.kafkaUpdatesTopic, events);
  }

  async sendEnrollmentUpdates(usersUpdates: IUserUpdatedData[]) {
    const now = Date.now();
    const events: IAppEvent[] = usersUpdates.map(data => ({
      key: data._id,
      event: Events.enrollment,
      data,
      timestamp: now,
      v: '1.0.0'
    }));
    await this._kafkaService.sendMany(config.kafkaUpdatesTopic, events);
  }

  async notifyCourseEvents(event: Events.course_created | Events.course_updated, data: Partial<ICourse | ICourse[]>);
  async notifyCourseEvents(event: Events.course_deleted, data: { _id: string });
  async notifyCourseEvents(event: Events, data: any) {
    if (!(data instanceof Array)) data = [data];
    const now = Date.now();
    await this._kafkaService.sendMany(config.kafkaUpdatesTopic, data.map(d => ({
      key: d._id,
      event,
      data: d,
      timestamp: now,
      v: '1.0.0'
    })));
  }
}

export enum Events {
  enroll = 'user_enrolled',
  drop = 'user_dropped',
  enrollment = 'user_enrollment',
  course_created = 'course_created',
  course_updated = 'course_updated',
  course_deleted = 'course_deleted'
}