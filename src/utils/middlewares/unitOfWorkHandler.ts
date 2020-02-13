import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { getDbClient } from '../getDbClient';
import { getFactory } from '../../repositories/RepositoryFactory';

export const unitOfWorkFactory = async (options = { useTransactions: false }, factory?: any) => {
  return new UnitOfWork(await getDbClient(), factory || getFactory(), options);
};

export const getUnitOfWorkHandler = () => {
  const factory = <any>getFactory();
  return async (ctx, next) => {
    const unitOfWork = await unitOfWorkFactory({ useTransactions: false }, factory);
    ctx.uow = unitOfWork;
    try {
      await next();
    } finally {
      await unitOfWork.dispose();
    }
  };
};