/* eslint-disable no-unused-vars */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { SessionProps } from '../models/Session';

declare global {
  namespace Express {
    export interface Request {
      session?: SessionProps | null;
    }
  }
}
