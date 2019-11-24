import { Context } from 'koa';
import loggerFactory from '../logging';

const logger = loggerFactory.getLogger('HTTP');

export const loggerHandler = async (ctx: Context, next) => {
  const start = process.hrtime();
  await next();
  const delta = process.hrtime(start);
  const responseTime = delta[0] * 1000 + delta[1] / 1000000;
  // tslint:disable-next-line:no-string-literal
  log(ctx.status, `[${ctx.status}] ${ctx.method} ${ctx.url} - ${responseTime.toFixed(0)}ms - ${JSON.stringify(ctx.headers)}`);
};

function log(status: number, message: string) {
  if (status < 300) return logger.info(message);
  else if (status >= 300 && status < 500) return logger.warn(message);
  return logger.error(message);
}