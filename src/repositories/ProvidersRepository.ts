import { Collection } from 'mongodb';
import { IProvider, IAcademicTermRequest } from '../models/entities/IProvider';
import { AduitableRepository } from './AduitableRepository';
import { IAcademicTerm } from '../models/entities/Common';

export class ProvidersRepository extends AduitableRepository<IProvider> {
  constructor(collection: Collection) {
    super('Providers', collection);
  }

  updateAcademicTerm(providerId: string, updateObj: IAcademicTermRequest, academicTerm: IAcademicTerm) {
    const { startDate, endDate } = updateObj;
    return this.update({
      _id: providerId,
      academicTerms: {
        $not: {
          $elemMatch: {
            $or: [
              {
                $and: [
                  { startDate: { $gt: new Date(startDate) } },
                  { startDate: { $lt: new Date(endDate) } },
                ]
              },
              {
                $and: [
                  { startDate: { $lt: new Date(startDate) } },
                  { endDate: { $gt: new Date(endDate) } },
                ]
              },
              {
                $and: [
                  { startDate: { $gt: new Date(startDate) } },
                  { endDate: { $lt: new Date(endDate) } },
                ]
              },
              {
                $and: [
                  { endDate: { $gt: new Date(startDate) } },
                  { endDate: { $lt: new Date(endDate) } },
                ]
              },
              {
                $and: [
                  { startDate: { $eq: new Date(startDate) } },
                  { endDate: { $eq: new Date(endDate) } },
                ]
              }
            ]
          }
        }
      }
    }, {
      $push: { academicTerms: academicTerm }
    });
  }

  deleteAcademicTermProvider(schoolId: string, academicTermId: string) {
    return this.update({ _id: schoolId }, {
      $pull: { academicTerms: { _id: academicTermId } }
    });
  }

}
