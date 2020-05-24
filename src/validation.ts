import { celebrate, Segments, Joi } from 'celebrate';
import overwatch from './overwatch';

class Validation {
  public authHeader = celebrate({
    [Segments.HEADERS]: Joi.object({
      authorization: Joi.string().required(),
    }).unknown(),
  });

  public followPlayer = celebrate({
    [Segments.BODY]: Joi.object().keys({
      tag: Joi.string()
        .pattern(/^\D\w{2,12}#\d{4,5}$/u)
        .required(),
      platform: Joi.string()
        .valid(...Object.keys(overwatch.friendlyPlatforms))
        .optional(),
    }),
  });

  public playerInfo = celebrate({
    [Segments.PARAMS]: Joi.object().keys({
      tagId: Joi.string().required(),
    }),
  });

  public globalFeed = celebrate({
    [Segments.QUERY]: Joi.object().keys({
      time: Joi.number().valid().min(1).optional(),
      page: Joi.number().valid().min(1).optional(),
    }),
  });

  public localFeed = celebrate({
    [Segments.QUERY]: Joi.object().keys({
      time: Joi.number().valid().min(1).optional(),
      page: Joi.number().valid().min(1).optional(),
    }),
  });
}

export default new Validation();
