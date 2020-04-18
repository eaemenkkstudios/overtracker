const express = require('express');
const { celebrate, Segments, Joi } = require('celebrate');

const routes = express.Router();

const overwatch = require('./overwatch');
const PlayerController = require('./controllers/PlayerController');

routes.post('/follow', celebrate({
  [Segments.HEADERS]: Joi.object({
    authorization: Joi.string().required(),
  }).unknown(),
  [Segments.BODY]: Joi.object().keys({
    tag: Joi.string().pattern(/^\D\w{2,12}#\d{4,5}$/u).required(),
    platform: Joi.string().valid(...Object.keys(overwatch.friendlyPlatforms)).optional(),
  }),
}), PlayerController.followPlayer);

routes.get('/info/:tagId', celebrate({
  [Segments.HEADERS]: Joi.object({
    authorization: Joi.string().required(),
  }).unknown(),
  [Segments.PARAMS]: Joi.object().keys({
    tagId: Joi.string().required(),
  }),
}), PlayerController.getStats);

routes.get('/following', celebrate({
  [Segments.HEADERS]: Joi.object({
    authorization: Joi.string().required(),
  }).unknown(),
}), PlayerController.getFollowing);

routes.get('/feed/global', celebrate({
  [Segments.QUERY]: Joi.object().keys({
    page: Joi.number().valid().min(1).optional(),
  }),
}), PlayerController.getGlobalFeed);

routes.get('/feed/local', celebrate({
  [Segments.HEADERS]: Joi.object({
    authorization: Joi.string().required(),
  }).unknown(),
  [Segments.QUERY]: Joi.object().keys({
    page: Joi.number().valid().min(1).optional(),
  }),
}), PlayerController.getLocalFeed);

module.exports = routes;
