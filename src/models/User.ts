import {
  Type, createSchema, typedModel, ExtractDoc, ExtractProps,
} from 'ts-mongoose';
import { PlayerSchema } from './Player';

export const UserSchema = createSchema({
  _id: Type.string({ required: true }),
  following: Type.array({ required: true, default: [] }).of(Type.ref(Type.string()).to('Player', PlayerSchema)),
  location: Type.object().of({
    lat: Type.number(),
    lng: Type.number(),
  }),
});

export default typedModel('User', UserSchema);
export type UserDoc = ExtractDoc<typeof UserSchema>;
export type UserProps = ExtractProps<typeof UserSchema>;
