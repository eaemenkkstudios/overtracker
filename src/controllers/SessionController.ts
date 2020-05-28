import { Response, Request } from 'express';
import passport from 'passport';
import { Strategy } from 'passport-bnet';
import session from 'express-session';
import User from '../models/User';
import Player from '../models/Player';
import PlayerController from './PlayerController';

interface Profile {
  sub?: string;
  id: number;
  battletag?: string;
  provider?: string;
  token: string;
}

class SessionController {
  private bnetId: string;

  private bnetSecret: string;

  private serverUrl: string;

  constructor() {
    this.bnetId = process.env.BNET_ID || '';
    this.bnetSecret = process.env.BNET_SECRET || '';
    this.serverUrl = process.env.SERVER_URL || '';
    passport.use(
      new Strategy({
        clientID: this.bnetId,
        clientSecret: this.bnetSecret,
        callbackURL: `${this.serverUrl}/auth/bnet/callback`,
        passReqToCallback: true,
      }, async (
        req: Request,
        acessToken: string,
        refreshToken: string,
        profile: Profile,
        done: (a: unknown, b: unknown) => unknown,
      ) => {
        if (!profile.battletag) return done(null, false);
        let user = await User.findOne({ battletag: profile.battletag, bnetId: profile.id });
        if (!user) {
          user = await User.create({ battletag: profile.battletag, bnetId: profile.id });
        }
        const player = await Player.findOne({ tag: profile.battletag });
        if (!player) {
          const newPlayer = await PlayerController.registerBattleTag(profile.battletag);
          if (newPlayer) {
            user.following.push(newPlayer._id);
            await user.save();
          }
        } else if (user.following.indexOf(player._id) === -1) {
          user.following.push(player._id);
          await user.save();
        }
        return done(null, {
          battletag: profile.battletag,
          bnetId: profile.id,
          token: acessToken,
        });
      }),
    );

    passport.serializeUser((user, done) => {
      done(null, user);
    });

    passport.deserializeUser((user, done) => {
      done(null, user);
    });
  }

  public async loginWithBnet(req: Request, res: Response): Promise<void> {
    const { code } = req.query;
    const cookies = req.headers.cookie?.split('; ') || [];
    let sessionId: string | undefined;
    cookies.forEach((cookie) => {
      const cookieParts = cookie.split('=');
      if (cookieParts[0] === 'connect.sid') {
        sessionId = cookieParts.pop();
      }
    });
    return res.redirect(`overtracker://login?code=${code}&session=${sessionId}`);
  }
}

export default new SessionController();
