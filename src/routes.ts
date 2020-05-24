import express from 'express';
import Validation from './validation';
import * as Controllers from './controllers';

const routes = express.Router();

routes.post(
  '/follow',
  Validation.authHeader,
  Validation.followPlayer,
  Controllers.Player.followPlayer,
);

routes.get(
  '/info/:tagId',
  Validation.authHeader,
  Validation.playerInfo,
  Controllers.Player.getStats,
);

routes.get('/following', Validation.authHeader, Controllers.Player.getFollowing);

routes.get(
  '/feed/global',
  Validation.globalFeed,
  Controllers.Player.getGlobalFeed,
);

routes.get(
  '/feed/local',
  Validation.authHeader,
  Validation.localFeed,
  Controllers.Player.getLocalFeed,
);

routes.post('/register', Validation.authHeader, Controllers.User.create);

routes.post('/login', Validation.authHeader, Controllers.Session.create);

routes.delete('/logout', Validation.authHeader, Controllers.Session.delete);

export default routes;
