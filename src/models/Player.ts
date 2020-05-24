import {
  Type, createSchema, typedModel, ExtractDoc, ExtractProps,
} from 'ts-mongoose';

const ScoreSchema = createSchema({
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
});

export const PlayerSchema = createSchema({
  tag: Type.string({ required: true }),
  portrait: Type.string({ required: true }),
  platform: Type.string({ required: true }),
  lastUpdate: Type.number(),
  scores: Type.array().of(Type.object().of(ScoreSchema)),
  current: Type.object().of(ScoreSchema),
});

export default typedModel('Player', PlayerSchema);
export type PlayerDoc = ExtractDoc<typeof PlayerSchema>;
export type PlayerProps = ExtractProps<typeof PlayerSchema>;
