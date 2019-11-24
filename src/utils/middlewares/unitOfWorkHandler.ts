import { UnitOfWork } from '@saal-oryx/unit-of-work';
import { getSkillRatingsFactory } from '../../repositories/SkillRatingsFactory';
import { getDbClient } from '../getDbClient';

export const getUnitOfWorkHandler = () => {
  const factory = <any>getSkillRatingsFactory();
  return async (ctx, next) => {
    const client = await getDbClient();
    const unitOfWork = new UnitOfWork(client, factory);
    ctx.uow = unitOfWork;
    try {
      await next();
    } finally {
      await unitOfWork.dispose();
    }
  };
};