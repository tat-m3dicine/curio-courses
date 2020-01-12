import { IAppEvent } from '../../../src/models/events/IAppEvent';

const format = (event: IAppEvent) => ({ value: JSON.stringify(event) });

export const getKStreamMock = (events: IAppEvent[], failedEvents?: IAppEvent[]) => {
  return (topic: string) => {
    let processed: any[] = [];
    return {
      kafka: { consumer: { commitLocalOffsetsForTopic: () => undefined } },
      start: (done, error) => {
        processed.length > 0 ? done() : error();
        return Promise.all(processed.map(result => result.source.source.value));
      },
      map: map => ({
        concatMap: concatMap => ({
          filter: filter => !topic.endsWith('failed') ?
            {
              to: to => events && (processed = events.map(format).map(map).map(concatMap).map(filter))
            } : {
              concatMap: concatMap2 => ({
                to: to => failedEvents && (processed = failedEvents.map(format).map(map).map(concatMap).map(filter).map(concatMap2))
              })
            }
        })
      })
    };
  };
};