import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import favicon from 'serve-favicon';
import cors from 'cors';
import mongoose from 'mongoose';
import connectMongo from 'connect-mongo';
import path from 'path';
import passport from 'passport';
import { errors } from 'celebrate';

import routes from './routes';

class App {
  public express: express.Application;

  private dbUrl: string;

  public constructor() {
    this.express = express();
    this.dbUrl = process.env.DATABASE_URL || '';
    this.middlewares();
    this.database();
    this.routes();
  }

  private middlewares(): void {
    this.express.disable('x-powered-by');
    this.express.use(favicon(path.resolve(__dirname, '..', 'assets', 'favicon.png')));
    this.express.use(bodyParser.urlencoded({ extended: true }));
    this.express.use(express.json());
    this.express.use(cors());
  }

  private database(): void {
    mongoose.connect(this.dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    },
    (err) => {
      if (!err) {
        console.log('Database conection succeeded.');
      } else {
        console.log(`Error in DB connection: ${JSON.stringify(err, undefined, 2)}`);
      }
    });
    const MongoStore = connectMongo(session);
    this.express.use(session({
      secret: process.env.SESSION_SECRET || '',
      resave: false,
      saveUninitialized: false,
      rolling: true,
      store: new MongoStore({ mongooseConnection: mongoose.connection }),
    }));
    this.express.use(passport.initialize());
    this.express.use(passport.session());
  }

  private routes(): void {
    this.express.use('/images', express.static(path.resolve(__dirname, '..', 'uploads')));
    this.express.use(routes);
    this.express.use(errors());
  }
}

export default new App().express;
