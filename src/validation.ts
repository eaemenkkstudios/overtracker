import { celebrate, Segments, Joi } from 'celebrate';
import { Request, Response, NextFunction } from 'express';
import overwatch from './overwatch';
import SessionManager from './utils/SessionManager';

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

  public forgotPassword = celebrate({
    [Segments.BODY]: Joi.object().keys({
      email: Joi.string().email().required(),
    }),
  })

  public resetPassword = celebrate({
    [Segments.BODY]: Joi.object().keys({
      token: Joi.string().required(),
      newPass: Joi.string().required(),
      confirmNewPass: Joi.string().required(),
    }),
  })

  public async validateSession(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> {
    const token = req.headers.authorization;
    if (token) {
      const session = await SessionManager.getSession(token);
      if (session) {
        req.session = session;
        return next();
      }
    }
    return res.status(401).send();
  }
}

export default new Validation();
