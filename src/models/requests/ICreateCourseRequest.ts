import { ILocales } from '../entities/Common';

export interface ICreateCourseRequest {
    locales: ILocales;
    subjectId: string;
    schoolId: string;
    sectionId: string;
    curriculum: string;
    grade: string;
    defaultLocale: string;
    isEnabled: boolean;
}