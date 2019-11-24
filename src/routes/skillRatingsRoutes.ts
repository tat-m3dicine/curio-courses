import KoaRoute from 'koa-tree-router';
import Koa from 'koa';
import { SkillRatingsService } from '../services/SkillRatingsService';
import { SkillRatingsController } from '../controllers/SkillRatingsController';
import { ForbiddenError } from '../exceptions/ForbiddenError';


export default () => {

  const skillRatingsRoutes = new KoaRoute();

  skillRatingsRoutes
    .get('/users/:userId/skills/:skillId', (ctx: Koa.Context, next: () => void) => {
      // tslint:disable-next-line: no-commented-code
      // if (!ctx.user) throw new ForbiddenError();
      const controller = new SkillRatingsController(new SkillRatingsService(ctx.uow));
      return controller.getForUserByFilter(ctx, next);
    })
    .get('/users/:userId/skills', (ctx: Koa.Context, next: () => void) => {
      // tslint:disable-next-line: no-commented-code
      // if (!ctx.user) throw new ForbiddenError();
      const controller = new SkillRatingsController(new SkillRatingsService(ctx.uow));
      return controller.getForOneUserByFilter(ctx, next);
    })
    .get('/skills', (ctx: Koa.Context, next: () => void) => {
      // tslint:disable-next-line: no-commented-code
      // if (!ctx.user) throw new ForbiddenError();
      const controller = new SkillRatingsController(new SkillRatingsService(ctx.uow));
      return controller.getManyUsersByFilter(ctx, next);
    });
  return skillRatingsRoutes;
};