# Courses
Courses Management with Schools and Sections.

## Service Architecture:
Node.js Koa backend with MongoDb clsuter and Kafka.

## Service Features:

## Onboarding Checklist / FAQ:
*  [Click here](./CheckList.md)

## Build Steps:
* **non-swarm mode** - development: `./start.sh`
* **swarm mode** - development: `./deploy dev`
* **swarm mode** - production-like: `./deploy`

## Run Tests:
./test.sh

## Healthcheck:

1.  Endpoint: `/healthcheck`
2.  Expected HTTP Response Code: **200**

## SmokeTest:
1.  Endpoint: `/healthcheck`
2.  Expected HTTP Response Code: **200**

## Service Logging:

1.  Log Levels supported: **trace, debug, info, warn, error, fatal**
2.  Default Loglevel: **debug**
3.  Log Formats supported: **Log4js**

## Environment Variables:

1.  `APP_PORT=80` default 80
2.  `KAFKA_REWARD_TOPIC=rewards_transactions`
3.  `MONGO_DB_URL=mongodb://courses-mongodb:27017/courses`
4.  `KAFKA_BROKERS=kafka:9092`
5.  `LOGGER_CONFIG={"disableClustering":true,"appenders":{"out":{"type":"stdout","layout":{"type":"pattern","pattern":"%[ [%d] [%p] %] %c - %x{correlationId} - %m"}}},"categories":{"default":{"appenders":["out"],"level":"trace"}}}`
6. ` IRP_URL: http://internal-dev3-saale.saal.ai:30307 (Required for migrating users)`


## Service Dependencies:
### Upstream
1. Client facing ...

### Downstream
1. MongoDB
2. Kafka
3. Radius

## Ports Used:
* **80**

## API
[Postman API Docs](https://documenter.getpostman.com/view/8891956/SWE85xxQ)