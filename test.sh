#!/usr/bin/env bash
docker build . -t saal-service-test:latest -f dev.Dockerfile
docker run                  \
    -it  \
    --rm                    \
    --name=saal-service-test       \
    --env "APP_PORT=80" \
    --env "KAFKA_TOPIC=rewards" \
    --env "MONGO_DB_URL=stub" \
    --env "KAFKA_BROKERS=stub" \
    -v "${PWD}":/app \
    -w "/app"  \
    saal-service-test:latest  \
    npm run test
