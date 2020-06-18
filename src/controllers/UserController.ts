import { Response, Request } from 'express';
import User from '../models/User';
import { HashMap } from '../utils/Utils';
import UserLocation, { regions } from '../utils/UserLocation';
import Player from '../models/Player';

class UserController {
  public updateLocation = async (req: Request, res: Response): Promise<Response> => {
    if (!req.user) return res.status(401).send();
    const { battletag } = req.user as { battletag: string };
    const { location } = req.body;

    const user = await User.findByIdAndUpdate(battletag, { location });
    if (user) return res.status(200).send();
    return res.status(400).send();
  }

  public getMainsPerRegionCache = async (): Promise<HashMap<HashMap<number>> | undefined> => {
    const cache = {} as HashMap<HashMap<number>>;
    const users = await User.find();
    await Promise.all(
      users.map(async (user) => {
        if (user.location) {
          const region = UserLocation.getNearestRegion({
            lat: user.location.lat || 0,
            lng: user.location.lng || 0,
          });
          const player = await Player.findOne({ tag: user._id });
          if (player && player.current) {
            if (!cache[region]) {
              cache[region] = {} as HashMap<number>;
            }
            if (cache[region][player.current.main]) {
              cache[region][player.current.main] += 1;
            } else {
              cache[region][player.current.main] = 1;
            }
          }
        }
      }),
    );
    return cache;
  };

  public getMainsPerRegion = async (req: Request, res: Response): Promise<Response> => {
    const cache = await this.getMainsPerRegionCache();
    if (cache) return res.status(200).json(cache);
    return res.status(400).send();
  }

  public getMostPlayedRegion = async (req: Request, res: Response): Promise<Response> => {
    const { hero } = req.params;

    const friendlyName = hero.replace('-', '');

    const cache = await this.getMainsPerRegionCache();
    if (!cache) return res.status(400).send();

    const playersPerRegion = {} as HashMap<number>;

    Object.keys(cache).forEach((region) => {
      if (cache[region][friendlyName]) playersPerRegion[region] = cache[region][friendlyName];
    });

    const region = Object.keys(playersPerRegion)[Object.values(playersPerRegion)
      .indexOf(Math.max(...Object.values(playersPerRegion)))];

    return res.status(200).json({
      location: Object.values(regions)[Object.keys(regions).indexOf(region)],
    });
  }

  // public makeDummyLocations = async (req: Request, res: Response): Promise<Response> => {
  //   const players = await Player.find();
  //   Promise.all(players.map(async (player) => {
  //     await User.create({
  //       _id: player.tag,
  //       following: [],
  //       location: {
  //         lat: Math.random() * 180 - 90,
  //         lng: Math.random() * 360 - 180,
  //       },
  //     });
  //   }));
  //   return res.status(200).send();
  // }
}

export default new UserController();
