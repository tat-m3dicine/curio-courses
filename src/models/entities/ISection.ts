import { ILocales, IAuditable } from './Common';
import { IEntity } from '@saal-oryx/unit-of-work';

export interface ISection extends Partial<IAuditable>, IEntity {
  locales: ILocales;
  schoolId: string;
  grade: string;
  students: string[];
}