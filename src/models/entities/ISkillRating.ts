import { IEntity } from '@saal-oryx/unit-of-work';

export interface ISkillRating extends IEntity {
  skill_id: string;
  user_id: string;
  ratings: { [key: string]: IRating };
  overall: IRating;
  history: IRatingHistory[];
}

export interface IRating {
  rating: number;
  contributions: number;
}

export interface IRatingHistory extends IRating {
  time: Date;
  ticket_id: string;
}

export interface ISkillRatingMap {
  [skill: string]: ISkillRating;
}

export interface ISkillChanges {
  user_id: string;
  skill_id: string;
  rating: {
    current: number;
    increment: number;
  };
  contributions: {
    current: number;
    increment: number;
  };
  mode: string;
  history: IRatingHistory[];
}

export interface ITicketData {
  ticketId: string;
  userId: string;
  topicId: string;
  subjectId: string;
  time: Date;
  mode: 'practice' | 'learn' | 'mpq';
  questions: IQuestion[];
  answers: IAnswer[];
}

export interface IQuestion {
  id: string;
  skill_codes?: string[];
  level: number;
  type: string;
}

export interface IAnswer {
  question_id: string;
  answer_id: string;
  correct: boolean;
  attempt: number;
}

export enum FomrulaMode {
  finished_practice = 'practice',
  finished_learn = 'learn',
  finished_mpq = 'mpq'
}