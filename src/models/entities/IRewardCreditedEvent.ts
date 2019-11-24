import { IUserProfile } from '../IUserToken';
import { ITicket } from '../requests/ITicket';

export interface IRewardCreditedEvent {
  event: 'reward_credited';
  key?: string;
  v: string;
  timestamp: number;
  data: {
    profile: IUserProfile,
    ticket: ITicket,
    results: {
      id: string;
      value: any;
    }[];
    formula: {
      type: string;
      version: string;
      params: { [key: string]: any };
    }
  };
  migrated?: boolean;
}