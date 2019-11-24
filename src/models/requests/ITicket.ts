export interface ITicket {
  id: string;
  issuer: string;
  created: number;
  consumed?: number;
  expiry: number;
  notBefore: number;
  data: any;
}