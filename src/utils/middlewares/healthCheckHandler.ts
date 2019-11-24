export const healthCheckHandler = async (ctx, next) => {
  if (ctx.method === 'GET' && ctx.url === `/healthcheck`) {
    ctx.body = 'OK';
  } else {
    await next();
  }
};