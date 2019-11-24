import { KafkaStreams } from 'kafka-streams';
import { KafkaService } from '../KafkaService';
import { SkillRatingsAggregatorStream } from './SkillsRatingAggregatorStream';
import { getNativeConfig } from './config';

export class StreamsProcessor {

  private _streams: any[] = [];
  constructor(protected kafakService: KafkaService) {

  }

  async start() {

    const promises: any[] = [];

    const skillsRatingAggregatorKafkaStreams = new KafkaStreams(
      <any>getNativeConfig('SkillsRatingAggregatorStream', 'SkillsRatingAggregatorStream')
    );
    const skillsRatingAggregatorStream = new SkillRatingsAggregatorStream(skillsRatingAggregatorKafkaStreams);
    promises.push(skillsRatingAggregatorStream.start());
    this._streams.push(skillsRatingAggregatorStream);

    return Promise.all(promises);
  }
}