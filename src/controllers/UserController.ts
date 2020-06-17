import { Response, Request } from 'express';
import User from '../models/User';

class UserController {
  public updateLocation = async (req: Request, res: Response): Promise<Response> => {
    if (!req.user) return res.status(401).send();
    const { battletag } = req.user as { battletag: string };
    const { location } = req.body;

    const user = await User.findByIdAndUpdate(battletag, { location });
    if (user) return res.status(200).send();
    return res.status(400).send();
  }
}

export default new UserController();
