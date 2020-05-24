import { Response, Request } from 'express';
import basicAuth from 'basic-auth';
import Encrypter from '../utils/Encrypter';
import SessionManager from '../utils/SessionManager';
import User from '../models/User';

class SessionController {
  public async create(req: Request, res: Response): Promise<Response> {
    const auth = basicAuth(req);
    if (!auth) return res.status(400).send();

    const { name: email, pass: password } = auth;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).send();

    SessionManager.deleteSessionByUser(user._id);
    if (
      Encrypter.sha256(password, user.password.salt)
          === user.password.hash
    ) {
      const token = await SessionManager.addSession(user);
      return res.status(200).json({ token });
    }

    return res.status(401).send();
  }

  public async delete(req: Request, res: Response): Promise<Response> {
    const token = req.headers.authorization;
    if (!token) return res.status(403).send();
    return res
      .status((await SessionManager.deleteSession(token)) ? 204 : 400)
      .send();
  }
}

export default new SessionController();
