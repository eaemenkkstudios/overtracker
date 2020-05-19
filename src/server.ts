import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import mongoose from 'mongoose';
import { errors } from 'celebrate';
import routes from './routes';
import PlayerController from './controllers/PlayerController';

const app = express();

mongoose.connect(process.env.DATABASE_URL || '', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});

async function updateOutdatedPlayers(): Promise<void> {
  const outdatedPlayers = PlayerController.getOutdatedPlayers();
  outdatedPlayers.then((players) => players.forEach((player) => PlayerController
    .updatePlayer(player.tag, player.platform)));
}

app.use(express.json());
app.use(cors());
app.use('/images', express.static(path.resolve(__dirname, '..', 'uploads')));
app.use(routes);
app.use(errors());

updateOutdatedPlayers();
setInterval(async () => {
  updateOutdatedPlayers();
}, 86400000 / 4); // 1000 * 60 * 60 * 24 = 86400000 = 24hrs

app.listen(process.env.PORT || 8080, () => {
  console.log(`Listening to port ${process.env.PORT || 8080}`);
});
