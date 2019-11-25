import config from '../../config';
import { KafkaStreams, KStream } from 'kafka-streams';
import loggerFactory from '../../utils/logging';
import { getDbClient } from '../../utils/getDbClient';
import { fromPromise } from 'most';

const logger = loggerFactory.getLogger('SkillRatingsAggregatorStream');

export class SkillRatingsAggregatorStream {

  protected stream: KStream;
  protected failuresStream: KStream;

  constructor(protected kafkaStreams: KafkaStreams) {
    logger.debug('Init ...');
    this.stream = kafkaStreams.getKStream(config.kafkaRewardTopic);
    this.failuresStream = kafkaStreams.getKStream(`${config.kafkaRewardTopic}_skill_db_failed`);
  }

  async start() {
    return Promise.all([this.rawStart(), this.failuresStart()]);
  }

  protected async rawStart() {
    this.stream
      .mapJSONConvenience()
      .concatMap(message => {
        logger.debug('raw-db-sink', message.offset, message.value.key, message.value.data.profile.id);
        const result = this.process(message).then(async result => {
          // tslint:disable-next-line: no-string-literal
          const client = this.stream['kafka']['consumer'];
          await client.commitLocalOffsetsForTopic(config.kafkaRewardTopic);
          return result;
        });
        return fromPromise(result);
      })
      .filter(v => v)
      .to(`${config.kafkaRewardTopic}_skill_db_failed`);
    return this.stream.start();
  }

  protected async failuresStart() {
    this.failuresStream
      .mapJSONConvenience()
      .concatMap(message => {
        logger.debug('failed-db-sink', message.offset, message.value.key, message.value.data.profile.id);
        const result = this.process(message)
          .then(async processingResults => {
            // tslint:disable-next-line: no-string-literal
            const client = this.failuresStream['kafka']['consumer'];
            await client.commitLocalOffsetsForTopic(`${config.kafkaRewardTopic}_skill_db_failed`);
            logger.debug('failed-db-sink commited', message.offset);
            return processingResults;
          });
        return fromPromise(result);
      })
      .filter(v => v)
      .concatMap(message => {
        const result = new Promise(resolve => {
          setTimeout(() => {
            logger.warn('writing_to_db_failed', JSON.stringify(message));
            return resolve(message);
          }, 1000);
        });
        return fromPromise(result);
      })
      .to(`${config.kafkaRewardTopic}_skill_db_failed`);
    return this.failuresStream.start();
  }

  protected async process(message: { value: any, partition: number, offset: number, topic: string }) {
    try {
      const event = message.value;
      if (!event || !event.data) return;
      const client = await getDbClient();
      await client.db().collection('SkillRatings').bulkWrite(<any>{});
      return;
    } catch (err) {
      if (err.code === 11000) return;
      logger.error('Processing Error', JSON.stringify(err), err);
      return {
        key: message.value.key,
        value: JSON.stringify({ ...message.value, error: JSON.stringify(err) })
      };
    }
  }
}