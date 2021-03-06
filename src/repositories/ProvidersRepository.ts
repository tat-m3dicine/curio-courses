import { Collection, ClientSession } from 'mongodb';
import { IProvider } from '../models/entities/IProvider';
import { AduitableRepository } from './AduitableRepository';
import { IAcademicTerm } from '../models/entities/Common';
import { IUpdateAcademicTermRequest } from '../models/requests/ISchoolRequests';
import { Repo } from '../models/RepoNames';

export class ProvidersRepository extends AduitableRepository<IProvider> {
  constructor(collection: Collection, session?: ClientSession) {
    super(Repo.providers, collection, session);
  }

  updateAcademicTerm(providerId: string, updateObj: IUpdateAcademicTermRequest, academicTerm: IAcademicTerm) {
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
