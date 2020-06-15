import {
  Type, createSchema, typedModel, ExtractDoc, ExtractProps,
} from 'ts-mongoose';
import { PlayerSchema } from './Player';

export const UserSchema = createSchema({
  battletag: Type.string({ required: true }),
  bnetId: Type.number({ required: true }),
  following: Type.array({ required: true, default: [] }).of(Type.ref(Type.string()).to('Player', PlayerSchema)),
  lat: Type.number({ default: 0.0 }),
  lng: Type.number({ default: 0.0 }),
});

export default typedModel('User', UserSchema);
export type UserDoc = ExtractDoc<typeof UserSchema>;
export type UserProps = ExtractProps<typeof UserSchema>;
