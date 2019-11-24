export interface IFilter {
  users: string[];
  skills: string[];
  threshold: number;
  operator: string;
  historySize: number;
  historySince: Date;
}