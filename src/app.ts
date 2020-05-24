import express from 'express';
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
    this.express.use(errors());
  }
}

export default new App().express;
