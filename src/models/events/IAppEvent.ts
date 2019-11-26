export interface IAppEvent {
  event: string;
  key?: string;
  v: string;
  timestamp: number;
  data: any;
}