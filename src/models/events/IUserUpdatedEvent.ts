export interface IUserUpdatedEvent {
  isState?: boolean;
  event: string;
  data: {
    _id: string;
    schoolId: string;
    courses: IUserCourseUpdates[];
  };
}

export interface IUserCourseUpdates {
  _id: string;
  sectionId: string;
  grade: string;
  subject: string;
  curriculum: string;
}