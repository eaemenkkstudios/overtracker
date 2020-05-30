import {
  Type, createSchema, typedModel, ExtractDoc, ExtractProps,
} from 'ts-mongoose';

const HeroSchema = createSchema({
  _id: Type.string({ required: true }),
  lore: Type.string({ required: true }),
});

export default typedModel('Hero', HeroSchema);
export type HeroDoc = ExtractDoc<typeof HeroSchema>;
export type HeroProps = ExtractProps<typeof HeroSchema>;
