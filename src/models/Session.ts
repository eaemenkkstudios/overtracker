import {
  typedModel, createSchema, Type, ExtractProps,
} from 'ts-mongoose';
import { UserSchema } from './User';

const SessionSchema = createSchema({
  _id: Type.string({ required: true }),
  user: Type.ref(Type.objectId({ required: true })).to('User', UserSchema),
  socket: Type.string(),
  time: Type.number({ required: true }),
});

export default typedModel('Session', SessionSchema);
export type SessionProps = ExtractProps<typeof SessionSchema>;
