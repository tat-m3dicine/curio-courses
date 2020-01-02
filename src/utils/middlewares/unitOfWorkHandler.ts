import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { getDbClient } from '../getDbClient';
import { getFactory } from '../../repositories/RepositoryFactory';

export const getUnitOfWorkHandler = () => {
  const factory = <any>getFactory();
  return async (ctx, next) => {
    const client = await getDbClient();
    const unitOfWork = new UnitOfWork(client, factory, { useTransactions: true });
    ctx.uow = unitOfWork;
    try {
      await next();
    } finally {
      await unitOfWork.dispose();
    }
  };
};