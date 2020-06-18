import 'dotenv/config';
import app from './app';
import PlayerController from './controllers/PlayerController';


async function updateOutdatedPlayers(): Promise<void> {
  const outdatedPlayers = await PlayerController.getOutdatedPlayers();
  outdatedPlayers.forEach((player) => PlayerController.updatePlayer(player.tag, player.platform));
}

const hoursToUpdatePlayers = +(process.env.HOURS_TO_UPDATE_PLAYERS || 24);

updateOutdatedPlayers();
setInterval(async () => {
  updateOutdatedPlayers();
}, hoursToUpdatePlayers * 1000 * 60 * 60);

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Listening to port ${port}`);
});
