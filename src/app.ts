import express from 'express';
import bodyParser from 'body-parser';
import favicon from 'serve-favicon';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
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
    this.express.set('view engine', 'ejs');
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
  }

  private routes(): void {
    this.express.use('/images', express.static(path.resolve(__dirname, '..', 'uploads')));
    this.express.use(routes);
    this.express.get('/404', (req, res) => res.render('404'));
    this.express.get('/*', (req, res) => res.redirect('/404'));
    this.express.use(errors());
  }
}

export default new App().express;
