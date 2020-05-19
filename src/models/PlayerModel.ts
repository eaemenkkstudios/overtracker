import { Type, createSchema, typedModel } from 'ts-mongoose';

const PlayerSchema = createSchema({
  tag: Type.string({ required: true }),
  portrait: Type.string({ required: true }),
  platform: Type.string({ required: true }),
  lastUpdate: Type.number(),
  scores: Type.array().of(Type.object().of({
    date: Type.number({ required: true }),
    endorsement: Type.number({ required: true }),
    games: Type.object().of({
      played: Type.number({ required: true }),
      won: Type.number({ required: true }),
    }),
    main: Type.string({ required: true }),
    rank: Type.object().of({
      damage: Type.string({ required: true }),
      support: Type.string({ required: true }),
      tank: Type.string({ required: true }),
    }),
  })),
  current: Type.object().of({
    date: Type.number({ required: true }),
    endorsement: Type.number({ required: true }),
    games: Type.object().of({
      played: Type.number({ required: true }),
      won: Type.number({ required: true }),
    }),
    main: Type.string({ required: true }),
    rank: Type.object().of({
      damage: Type.string({ required: true }),
      support: Type.string({ required: true }),
      tank: Type.string({ required: true }),
    }),
  }),
});

export default typedModel('Player', PlayerSchema);
