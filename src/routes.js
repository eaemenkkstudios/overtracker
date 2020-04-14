const express = require('express');
const { celebrate, Segments, Joi } = require('celebrate');

const routes = express.Router();

const PlayerController = require('./controllers/PlayerController');

routes.post('/create', celebrate({
  [Segments.HEADERS]: Joi.object({
    authorization: Joi.string().required(),
  }).unknown(),
  [Segments.BODY]: Joi.object().keys({
    tag: Joi.string().pattern(/^\D\w{2,12}#\d{4,5}$/u).required(),
    platform: Joi.string().valid(...Object.keys(PlayerController.friendlyPlatforms)).optional(),
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

module.exports = routes;
