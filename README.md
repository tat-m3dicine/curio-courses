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

**(Required)**

1. `KAFKA_CLIENT_ID=courses` 
1. `MONGO_DB_URL=mongodb://courses-mongodb:27017/courses`
4. `KAFKA_BROKERS=kafka:9092`
5. `REDIS_PORT=6379`
6. `REDIS_HOST=redis_host_url`
7. `IRP_URL=IRP_URL`
8. `LOGGER_CONFIG={"disableClustering":true,"appenders":{"out":{"type":"stdout","layout":{"type":"pattern","pattern":"%[ [%d] [%p] %] %c - %x{correlationId} - %m"}}},"categories":{"default":{"appenders":["out"],"level":"trace"}}}`

**(optional, with default values)**
1. `APP_PORT=80`
2. `NODE_ENV=production` 
3. `KAFKA_PRODUCERS_GROUP=courses-producers-group`
4. `AUTHORIZED_ROLE=root`
5. `COMMANDS_TIMEOUT=3000`

## Service Dependencies:
### Upstream
1. Client facing ...

### Downstream
1. MongoDB
2. Kafka
3. Redis

### MongoDB Replica set configs
#### Step 1 - Initiate
```sh
rs.initiate({
  _id: "rs0",
  protocolVersion: 1,
  members: [
    { _id: 0, host : "courses-mongodb:27017" }
  ]
})
```
#### Step 2 - Config
```sh
rs.reconfig({
  _id: "rs0",
  protocolVersion: 1,
  members: [
    { _id: 0, host : "courses-mongodb:27017" }
  ]
}, {force: true})
```

## Ports Used:
* **80**

## API
[Postman API Docs](https://documenter.getpostman.com/view/4856492/SWEDyttY)
