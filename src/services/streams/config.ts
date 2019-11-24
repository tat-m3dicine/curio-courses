import config from '../../config';

const batchOptions = {
  batchSize: 1,
  commitEveryNBatch: 1,
  concurrency: 1,
  commitSync: false,
  noBatchCommits: true
};


export const getNativeConfig = (groupId: string, clientId: string) => {
  return {
    ...nativeConfig, noptions: {
      ...nativeConfig.noptions,
      'group.id': groupId,
      'client.id': clientId,
    }
  };
};

const nativeConfig = {
  noptions: {
    'metadata.broker.list': config.kafkaBrokers.join(','), // native client requires broker hosts to connect to
    'group.id': 'kafka-streams-test-native',
    'client.id': 'kafka-streams-test-name-native',

    'event_cb': true,
    'compression.codec': 'snappy',
    'api.version.request': true,

    'socket.keepalive.enable': true,
    'socket.blocking.max.ms': 100,

    'enable.auto.commit': false,
    'auto.commit.interval.ms': Number.MAX_VALUE,
    'enable.auto.offset.store': true,

    'heartbeat.interval.ms': 250,
    'retry.backoff.ms': 250,
    'message.max.bytes': 33554432,
    'fetch.min.bytes': 100,
    'fetch.message.max.bytes': 2 * 1024 * 1024,
    'queued.min.messages': 100,

    'fetch.error.backoff.ms': 100,
    'queued.max.messages.kbytes': 50,

    'fetch.wait.max.ms': 1000,
    'queue.buffering.max.ms': 1000,

    'batch.num.messages': 10000
  },
  tconf: {
    'offset.store.method': 'broker',
    'auto.offset.reset': 'earliest',
    'request.required.acks': 1
  },
  batchOptions,
  workerPerPartition: 1,
};