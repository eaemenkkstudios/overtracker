const express = require('express');
const { celebrate, Segments, Joi } = require('celebrate');

const routes = express.Router();

const PlayerController = require('./controllers/PlayerController');

routes.post('/add/:battleTag', celebrate({
  [Segments.HEADERS]: Joi.object({
    authorization: Joi.string().required(),
  }).unknown(),
  [Segments.PARAMS]: Joi.object().keys({
    battleTag: Joi.string().pattern(/^\D\w{2,12}-\d{4,5}$/u).required(),
  }),
  [Segments.QUERY]: Joi.object().keys({
    platform: Joi.string().valid(...Object.keys(PlayerController.friendlyPlatforms)).optional(),
  }),
}), PlayerController.followPlayer);

routes.get('/tag/:battleTag', celebrate({
  [Segments.PARAMS]: Joi.object().keys({
    battleTag: Joi.string().pattern(/^\D\w{2,12}-\d{4,5}$/u).required(),
  }),
}), PlayerController.getStats);

routes.get('/outdated', PlayerController.getOutdatedPlayers);

module.exports = routes;
