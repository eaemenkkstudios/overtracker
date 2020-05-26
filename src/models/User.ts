import {
  Type, createSchema, typedModel, ExtractDoc, ExtractProps,
} from 'ts-mongoose';
import { PlayerSchema } from './Player';

export const UserSchema = createSchema({
  email: Type.string({ required: true }),
  password: Type.object({ required: true }).of({
    hash: Type.string({ required: true }),
    salt: Type.string({ required: true }),
  }),
  following: Type.array({ required: true, default: [] }).of(Type.ref(Type.string()).to('Player', PlayerSchema)),
});

export default typedModel('User', UserSchema);
export type UserDoc = ExtractDoc<typeof UserSchema>;
export type UserProps = ExtractProps<typeof UserSchema>;
