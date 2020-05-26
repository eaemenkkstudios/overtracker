import 'dotenv/config';
import app from './app';
import PlayerController from './controllers/PlayerController';

async function updateOutdatedPlayers(): Promise<void> {
  const outdatedPlayers = await PlayerController.getOutdatedPlayers();
  outdatedPlayers.forEach((player) => PlayerController.updatePlayer(player.tag, player.platform));
}

updateOutdatedPlayers();
setInterval(async () => {
  updateOutdatedPlayers();
}, 86400000 / 4); // 1000 * 60 * 60 * 24 / 4 = 86400000s / 4 = 24hrs / 4 = 6hrs

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Listening to port ${port}`);
});
