import Encrypter from './Encrypter';
import Session, { SessionProps } from '../models/Session';
import { UserProps } from '../models/User';

interface Populate {
  path: string;
  select?: string;
  populate?: Populate;
}

class SessionManager {
  /**
   * Creates a new session for the given user
   * @param user User object from the database
   * @returns The session's token
   */
  public async addSession(user: UserProps): Promise<string> {
    const token = Encrypter.randomString(256);
    const session = {
      _id: token,
      user: user._id,
      time: new Date().getTime(),
    };
    return Session.create(session)
      .then((res) => res._id)
      .catch(() => null);
  }

  /**
   * Adds the socket id to the User Session
   * @param token Session's token
   * @param socket SocketId of the user
   * @returns Boolean that indicates that the session was updated or not
   */
  public async updateSession(token: string, socket: string): Promise<boolean> {
    const session = await Session.findById(token);
    if (!session) return false;
    session.socket = socket;
    await session.save();
    return true;
  }

  /**
   * Returns the session if it exists
   * @param token Session's token
   * @returns The session document
   */
  public async getSession(token: string): Promise<SessionProps | null> {
    return Session.findById(token).populate({
      path: 'user',
      select: '-password -__v',
    });
  }

  /**
   * Gets all the active operator sessions
   * @param options Optional options object that will be sent to the populate function
   * @returns All the active sessions
   */
  public async getAllActiveSessions(
    options?: Populate,
  ): Promise<SessionProps[] | null> {
    return Session.find({ socket: /^(?!\s*$).+/ }).populate(options || {
      path: 'user',
      select: 'name email cpf',
    });
  }

  /**
   * Deletes an User Session by the token
   * @param token Session's token
   * @returns Boolean that indicates that the session was deleted or not
   */
  public async deleteSession(token: string): Promise<boolean> {
    return Session.findByIdAndDelete(token)
      .then(() => true)
      .catch(() => false);
  }

  /**
   * Deletes an User Session by the UserId
   * @param user User's ID
   * @returns Boolean that indicates that the session was deleted or not
   */
  public async deleteSessionByUser(user: string): Promise<boolean> {
    return Session.findOneAndDelete({ user })
      .then(() => true)
      .catch(() => false);
  }

  /**
   * Removes the socketId from a session
   * @param socket The socketId to be removed from its session
   * @returns Boolean indicating if the socket was removed from the session or not
   */
  public async deleteSessionSocket(socket: string): Promise<boolean> {
    const session = await Session.findOne({ socket });
    if (!session) return false;
    session.socket = undefined;
    await session.save();
    return true;
  }
}

export default new SessionManager();
