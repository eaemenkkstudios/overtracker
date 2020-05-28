import express from 'express';
import passport from 'passport';
import Validation from './validation';
import * as Controllers from './controllers';

const routes = express.Router();

routes.post(
  '/follow',
  Validation.validateSession,
  Validation.followPlayer,
  Controllers.Player.followPlayer,
);

routes.get(
  '/info/:tagId',
  Validation.validateSession,
  Validation.playerInfo,
  Controllers.Player.getStats,
);

routes.get(
  '/following',
  Validation.validateSession,
  Controllers.Player.getFollowing,
);

routes.get(
  '/feed/global',
  Validation.globalFeed,
  Controllers.Player.getGlobalFeed,
);

routes.get(
  '/feed/local',
  Validation.validateSession,
  Validation.localFeed,
  Controllers.Player.getLocalFeed,
);

routes.get('/teste', Validation.sendMessageBot, Controllers.DialogFlow.sendMessage);

routes.get('/auth/bnet', passport.authenticate('bnet'));

routes.get(
  '/auth/bnet/callback',
  passport.authenticate('bnet', { failureRedirect: '/auth/bnet' }),
  Controllers.Session.loginWithBnet,
);

export default routes;
