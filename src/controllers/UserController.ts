import { Response, Request } from 'express';
import basicAuth from 'basic-auth';

import Encrypter from '../utils/Encrypter';
import User from '../models/User';

class UserController {
  public async create(req: Request, res: Response): Promise<Response> {
    const auth = basicAuth(req);
    if (!auth) return res.status(400).send();

    const { name: email, pass: password } = auth;

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).send();

    const user = {
      email,
      password: Encrypter.hashPassword(password),
    };
    return User.create(user)
      .then((newUser) => res.json(newUser))
      .catch((err) => res.json(err));
  }
}

export default new UserController();
