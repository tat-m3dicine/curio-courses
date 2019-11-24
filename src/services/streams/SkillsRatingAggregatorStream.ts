import config from '../../config';
import { KafkaStreams, KStream } from 'kafka-streams';
import loggerFactory from '../../utils/logging';
import { getDbClient } from '../../utils/getDbClient';
import { IRewardCreditedEvent } from '../../models/entities/IRewardCreditedEvent';
import { ITicketData, ISkillRating, ISkillRatingMap, IQuestion, IAnswer, FomrulaMode, IRatingHistory, ISkillChanges } from '../../models/entities/ISkillRating';
import ratingFormula from '../RatingFormulaService';
import { MongoClient } from 'mongodb';
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
      const ticket: ITicketData = this.transformInput(event);
      if (!ticket.questions) return;

      const client = await getDbClient();
      const storedSkills = await this.getStoredSkills(ticket, client);
      const skillChangesMap = this.getChanges(ticket, storedSkills);
      const dbUpdateObjs = this.getDbUpdateObject(Object.values(skillChangesMap), message.topic, message.partition, message.offset);

      if (dbUpdateObjs.length !== 0) {
        await client.db().collection('SkillRatings').bulkWrite(dbUpdateObjs);
      }
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

  protected async getStoredSkills(data: ITicketData, client: MongoClient): Promise<ISkillRatingMap> {
    const affectedSkills = Array.from<string>(new Set(
      data.questions.reduce((list, q) => list.concat(q.skill_codes || []), <string[]>[])
    ));
    const storedSkills = await client.db().collection('SkillRatings').find({
      user_id: data.userId,
      skill_id: { $in: affectedSkills }
    }, { projection: { user_id: 1, skill_id: 1, overall: 1 } }).toArray();
    return affectedSkills.reduce((map, skillId) => ({
      ...map,
      [skillId]: storedSkills.find(x => x.skill_id === skillId) || this.emptySkillsRating(skillId, data.userId)
    }), {});
  }

  protected setupSkillChangesMap(mode: string, skillRatings: ISkillRatingMap) {
    const skillChanges = Object.keys(skillRatings).reduce((map, skillId) => {
      map[skillId] = {
        skill_id: skillId,
        user_id: skillRatings[skillId].user_id,
        rating: {
          current: skillRatings[skillId].overall.rating,
          increment: 0,
        },
        contributions: {
          current: skillRatings[skillId].overall.contributions,
          increment: 0,
        },
        mode,
        history: []
      };
      return map;
    }, <{ [skillId: string]: ISkillChanges }>{});
    return skillChanges;
  }

  protected getChanges(data: ITicketData, skillRatings: ISkillRatingMap) {
    const questions = data.questions.reduce((map, question) => ({ ...map, [question.id]: question }), {});
    const skillChangesMap = this.setupSkillChangesMap(data.mode, skillRatings);
    for (const answer of data.answers) {
      const question: IQuestion = questions[answer.question_id];
      if (!question || !question.skill_codes) continue;
      for (const skillId of question.skill_codes) {
        const skillChanges = skillChangesMap[skillId];
        const increment = this.calculateRatingIncrement(skillChanges, answer, question);
        this.applyChanges(skillChanges, increment, data);
      }
    }
    return skillChangesMap;
  }

  protected calculateRatingIncrement(skillChanges: ISkillChanges, answer: IAnswer, question: IQuestion) {
    const { current: currentRating } = skillChanges.rating;
    const { current: currentContributions } = skillChanges.contributions;

    const { correct, attempt } = answer;
    const { level, type } = question;
    const score = ratingFormula({ mode: skillChanges.mode, level: level.toString(), type, attempt, correct });

    let experience: number;
    if (currentRating < 0.25) experience = 1.5;
    else if (currentRating < 0.5) experience = 1.25;
    else if (currentRating < 0.75) experience = 1;
    else experience = 0.75;

    let increment = score * experience;
    const newRating = currentRating + increment;

    const scaller = config.contributionsScaler > currentContributions ? config.contributionsScaler - currentContributions : 1;
    const scalledRating = newRating / scaller;
    increment = scalledRating - currentRating;

    if (newRating < -1) increment = (currentRating + 1) * -1;
    else if (newRating > 1) increment = (currentRating - 1) * -1;

    return increment;
  }

  protected applyChanges(skillChanges: ISkillChanges, ratingIncrement: number, ticketData: ITicketData) {
    skillChanges.rating.current += ratingIncrement;
    skillChanges.rating.increment += ratingIncrement;

    skillChanges.contributions.current += 1;
    skillChanges.contributions.increment += 1;

    skillChanges.history.push(<IRatingHistory>{
      ticket_id: ticketData.ticketId,
      time: ticketData.time,
      rating: skillChanges.rating.current,
      contributions: skillChanges.contributions.current,
    });
  }

  protected getDbUpdateObject(chnages: ISkillChanges[], topic: string, partition: number, offset: number) {
    const offsetKey = `offsets.${topic}.${partition}`;
    return chnages.map(change => ({
      updateOne: {
        filter: {
          _id: `${change.user_id}@${change.skill_id}`,
          $or: [
            { [offsetKey]: { $exists: false } },
            { [offsetKey]: { $lt: offset } }
          ]
        },
        update: {
          $inc: {
            'overall.rating': change.rating.increment,
            'overall.contributions': change.contributions.increment,
            [`ratings.${change.mode}.rating`]: change.rating.increment,
            [`ratings.${change.mode}.contributions`]: change.contributions.increment
          },
          $push: {
            history: {
              $each: change.history,
              $slice: -config.historyLength
            }
          },
          $set: {
            [offsetKey]: offset,
            updatedAt: new Date()
          },
          $setOnInsert: {
            user_id: change.user_id,
            skill_id: change.skill_id,
            createdAt: new Date()
          }
        },
        upsert: true
      }
    }));
  }

  protected transformInput(ticket: IRewardCreditedEvent): ITicketData {
    const { data } = ticket;
    const { topic_id, subject_id, questions } = data.ticket.data;
    const { type: formulaMode, params: { answers } } = data.formula;
    return {
      ticketId: data.ticket.id,
      userId: data.profile.id,
      topicId: topic_id,
      subjectId: subject_id,
      time: new Date(data.ticket.consumed || data.ticket.created || Date.now()),
      mode: FomrulaMode[formulaMode],
      questions,
      answers
    };
  }

  protected emptySkillsRating(skillId: string, userId: string) {
    return <ISkillRating>{
      skill_id: skillId,
      user_id: userId,
      ratings: {},
      overall: {
        rating: 0,
        contributions: 0
      }
    };
  }
}