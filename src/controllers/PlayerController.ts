import { Response, Request } from 'express';
import oversmash from 'oversmash';
import overwatch, {
  Roles, Obj,
} from '../overwatch';
import Utils from '../utils/Utils';
import Player, { PlayerProps, PlayerDoc } from '../models/Player';
import heroes from '../heroes.json';
import User from '../models/User';

interface FollowedPlayer {
  id: string;
  portrait: string;
  current: {
    endorsement: number;
    role: string;
  };
  platform: string;
  tag: string;
}

class PlayerController {
  private hoursToUpdatePlayers: number;

  private maxTagsPerRole: string;

  public readonly scoreCard: Obj = {
    type: 'Obj',
    endorsement: overwatch.player.ENDORSEMENT.UPDATED,
    games: {
      type: 'Obj',
      played: overwatch.player.MATCHES.PLAYED.UPDATED,
      won: overwatch.player.MATCHES.WON.UPDATED,
    },
    main: overwatch.player.MAIN.HERO.UPDATED,
    rank: {
      type: 'Obj',
      damage: overwatch.player.SR.DAMAGE.UPDATED,
      support: overwatch.player.SR.SUPPORT.UPDATED,
      tank: overwatch.player.SR.TANK.UPDATED,
    },
  };

  public readonly scoreCardExtended: Obj = {
    type: 'Obj',
    endorsement: overwatch.player.ENDORSEMENT.UPDATED,
    games: {
      type: 'Obj',
      played: overwatch.player.MATCHES.PLAYED.UPDATED,
      won: overwatch.player.MATCHES.WON.UPDATED,
    },
    main: {
      type: 'Obj',
      hero: overwatch.player.MAIN.HERO.UPDATED,
      time: overwatch.player.MAIN.TIME.UPDATED,
      role: overwatch.player.MAIN.ROLE.UPDATED,
    },
    rank: {
      type: 'Obj',
      damage: overwatch.player.SR.DAMAGE.UPDATED,
      support: overwatch.player.SR.SUPPORT.UPDATED,
      tank: overwatch.player.SR.TANK.UPDATED,
    },
  };

  // const highlightChance = 0.75;

  public readonly cards: Obj = {
    type: 'Obj',
    SUPPORT_UPDATE: {
      type: 'Obj',
      cardType: 'sr_update',
      role: Roles.SUPPORT,
      sr: {
        type: 'Obj',
        previous: overwatch.player.SR.SUPPORT.PREVIOUS,
        current: overwatch.player.SR.SUPPORT.CURRENT,
      },
    },
    DAMAGE_UPDATE: {
      type: 'Obj',
      cardType: 'sr_update',
      role: Roles.DAMAGE,
      sr: {
        type: 'Obj',
        previous: overwatch.player.SR.DAMAGE.PREVIOUS,
        current: overwatch.player.SR.DAMAGE.CURRENT,
      },
    },
    TANK_UPDATE: {
      type: 'Obj',
      cardType: 'sr_update',
      role: Roles.TANK,
      sr: {
        type: 'Obj',
        previous: overwatch.player.SR.TANK.PREVIOUS,
        current: overwatch.player.SR.TANK.CURRENT,
      },
    },
    ENDORSEMENT_UPDATE: {
      type: 'Obj',
      cardType: 'endorsement_update',
      endorsement: {
        type: 'Obj',
        previous: overwatch.player.ENDORSEMENT.PREVIOUS,
        current: overwatch.player.ENDORSEMENT.CURRENT,
      },
    },
    WINRATE_UPDATE: {
      type: 'Obj',
      cardType: 'winrate_update',
      winrate: {
        type: 'Obj',
        previous: overwatch.player.WINRATE.PREVIOUS,
        current: overwatch.player.WINRATE.CURRENT,
      },
    },
    MAIN_UPDATE: {
      type: 'Obj',
      cardType: 'main_update',
      previous: {
        type: 'Obj',
        hero: overwatch.player.MAIN.HERO.PREVIOUS,
        role: overwatch.player.MAIN.ROLE.PREVIOUS,
      },
      current: {
        type: 'Obj',
        hero: overwatch.player.MAIN.HERO.CURRENT,
        role: overwatch.player.MAIN.ROLE.CURRENT,
        // time: overwatch.player.MAIN.TIME.CURRENT,
      },
    },
    HIGHLIGHT: {
      type: 'Obj',
      cardType: 'highlight',
      sr: {
        type: 'Obj',
        current: overwatch.player.SR.MAIN.CURRENT,
        slope: overwatch.player.SR.MAIN.SLOPE,
      },
      winrate: {
        type: 'Obj',
        current: overwatch.player.WINRATE.CURRENT,
        slope: overwatch.player.WINRATE.SLOPE,
      },
      main: {
        type: 'Obj',
        current: overwatch.player.MAIN.HERO.CURRENT,
        role: overwatch.player.MAIN.ROLE.CURRENT,
        time: overwatch.player.MAIN.TIME.UPDATED,
      },
    },
  };

  constructor() {
    this.maxTagsPerRole = process.env.MAX_TAGS_PER_ROLE || '';
    this.hoursToUpdatePlayers = +(process.env.HOURS_TO_UPDATE_PLAYERS || 24);
  }

  public makeScore = async (
    tag: string,
    platform: string,
    extended: boolean,
    forceUpdate: boolean,
  ): Promise<Obj | undefined> => {
    const score: Obj = {
      type: 'Obj',
      date: new Date().getTime(),
      ...Utils.cloneObject(extended ? this.scoreCardExtended : this.scoreCard),
    };
    const success = await overwatch.fillObject(score, tag, platform, 1, forceUpdate);
    return success ? score : undefined;
  }

  public makeFeed = async (
    role: string,
    time: number,
    generic: boolean,
    page: number,
    customList?: PlayerProps[],
  ): Promise<Obj[]> => {
    const finalCards: Obj[] = [];
    let players: PlayerProps[] = [];
    if (customList) {
      players = customList;
    } else {
      const filter = `current.rank.${role}`;
      players = await Player.find({ [filter]: { $gt: 0 } })
        .skip((page - 1) * +this.maxTagsPerRole)
        .limit(+this.maxTagsPerRole)
        .sort({ [filter]: 'desc' });
    }

    await Promise.all(players.map(async (player) => {
      if (player && player.current) {
        const cardArray: Obj[] = [];
        // Main update card
        if (player.scores && player.scores.length >= time) {
          if (generic && (time === 1 ? player.current.main
            : player.scores[player.scores.length - time + 1].main)
            !== player.scores[player.scores.length - time].main) {
            cardArray.push({
              type: 'Obj',
              date: player.current.date,
              player: {
                type: 'Obj',
                id: player._id.toHexString(),
                tag: player.tag,
                platform: player.platform,
              },
              ...Utils.cloneObject(this.cards.MAIN_UPDATE as object),
            });
          }
          // Endorsement update card
          if (generic && player.scores && player.scores.length >= time
            && (time === 1 ? player.current.endorsement
              : player.scores[player.scores.length - time + 1].endorsement)
            !== player.scores[player.scores.length - time].endorsement) {
            cardArray.push({
              type: 'Obj',
              date: player.current.date,
              player: {
                type: 'Obj',
                id: player._id.toHexString(),
                tag: player.tag,
                platform: player.platform,
              },
              ...Utils.cloneObject(this.cards.ENDORSEMENT_UPDATE as object),
            });
          }
          if (generic && player.scores && player.scores.length >= time
            && (time === 1 ? ((player.current.games?.won || 0)
              / (player.current.games?.played || 1))
              : ((player.scores[player.scores.length - time + 1].games?.won || 0)
                / (player.scores[player.scores.length - time + 1].games?.played || 1)))
            !== ((player.scores[player.scores.length - time].games?.won || 0)
              / (player.scores[player.scores.length - time].games?.played || 1))) {
            cardArray.push({
              type: 'Obj',
              date: player.current.date,
              player: {
                type: 'Obj',
                id: player._id.toHexString(),
                tag: player.tag,
                platform: player.platform,
              },
              ...Utils.cloneObject(this.cards.WINRATE_UPDATE as object),
            });
          }
          if (player.scores && player.scores.length >= time
            && (time === 1 ? player.current.rank[role as keyof PlayerProps['current']]
              : player.scores[player.scores.length - time + 1].rank[role as keyof PlayerProps['current']])
            !== player.scores[player.scores.length - time].rank[role as keyof PlayerProps['current']]) {
            switch (role) {
              case Roles.SUPPORT:
                cardArray.push({
                  type: 'Obj',
                  date: player.current.date,
                  player: {
                    type: 'Obj',
                    id: player._id.toHexString(),
                    tag: player.tag,
                    platform: player.platform,
                  },
                  ...Utils.cloneObject(this.cards.SUPPORT_UPDATE as object),
                });
                break;
              case Roles.DAMAGE:
                cardArray.push({
                  type: 'Obj',
                  date: player.current.date,
                  player: {
                    type: 'Obj',
                    id: player._id.toHexString(),
                    tag: player.tag,
                    platform: player.platform,
                  },
                  ...Utils.cloneObject(this.cards.DAMAGE_UPDATE as object),
                });
                break;
              case Roles.TANK:
                cardArray.push({
                  type: 'Obj',
                  date: player.current.date,
                  player: {
                    type: 'Obj',
                    id: player._id.toHexString(),
                    tag: player.tag,
                    platform: player.platform,
                  },
                  ...Utils.cloneObject(this.cards.TANK_UPDATE as object),
                });
                break;
              default:
                break;
            }
          }
        }
        if (generic /* && Math.random() <= highlightChance */) {
          cardArray.push({
            type: 'Obj',
            date: new Date().getTime(),
            player: {
              type: 'Obj',
              id: player._id.toHexString(),
              tag: player.tag,
              platform: player.platform,
            },
            ...Utils.cloneObject(this.cards.HIGHLIGHT as object),
          });
        }
        await Promise.all(cardArray.map(async (card) => {
          const success = await overwatch
            .fillObject(card, player.tag, player.platform, time, false);
          if (success === true) finalCards.push(Utils.cloneObject(card as object) as Obj);
        }));
      }
    }));
    return finalCards;
  }

  /**
   * Adds the rank image url to each rank
   * @param score Player's score object
   * @returns Friendly Score Object
   */
  public makeFriendlyScore(score: Obj): Obj {
    if (typeof score.main === 'string') {
      score.main = {
        type: 'Obj',
        hero: score.main,
        role: heroes[score.main as keyof typeof heroes],
      };
    }

    Object.keys(score.rank).forEach((rank) => {
      if (!overwatch.validateRole(rank)) return;
      const img = overwatch.getRankImageURL((score.rank as Obj)[rank] as number);
      (score.rank as Obj).type = 'Obj';
      (score.rank as Obj)[rank] = {
        type: 'Obj',
        sr: (score.rank as Obj)[rank],
        img,
      };
    });
    overwatch.clearObjTypes(score);
    return score;
  }

  /**
   * Registers the player in the database
   * @param tag Player's battletag
   * @param platform Player's platform
   * @returns The database referece or `undefined`
   */
  public registerBattleTag = async (
    tag: string,
    platform = 'pc',
  ): Promise<PlayerDoc | undefined> => {
    const player = await oversmash().player(tag, platform);
    if (!player.accounts.length) return undefined;
    let platformIndex = -1;
    if (platform) {
      for (let i = 0; i < player.accounts.length; i += 1) {
        if (player.accounts[i].platform === platform) {
          platformIndex = i;
        }
      }
    } else {
      platformIndex = 0;
    }
    if (platformIndex < 0) return undefined;
    const current = await this.makeScore(tag, platform, false, true);
    let finalStats = {};
    if (current) {
      finalStats = {
        tag,
        platform,
        portrait: player.accounts[platformIndex].portrait,
        current,
        lastUpdate: current.date,
        scores: [],
      };
    } else {
      finalStats = {
        tag,
        platform,
        lastUpdate: new Date().getTime(),
        scores: [],
      };
    }
    return Player.create(finalStats);
  }

  /**
   * Gets all of the players that haven't been updated in greater than the
   * specified hours
   * @returns Array of outdated players
   */
  public getOutdatedPlayers = async (): Promise<PlayerDoc[]> => {
    const currentTime = new Date().getTime();
    return Player.find({
      lastUpdate: { $lte: currentTime - this.hoursToUpdatePlayers * 1000 * 60 * 60 },
    });
  }

  /**
   * Updates the score of the player
   * @param tag Player's battletag
   * @param platform Player's platform
   */
  public updatePlayer = async (tag: string, platform: string): Promise<void> => {
    const [newScore, newPlayer] = await Promise.all(
      [this.makeScore(tag, platform, false, true), oversmash().player(tag)],
    );
    if (!newScore || !newPlayer) return;

    const player = await Player.findOne({ tag });
    if (!player) return;

    const lastScore = player.current;
    if (!lastScore) return;

    const hasChanged = JSON.stringify(lastScore.games) !== JSON.stringify(newScore.games)
    || JSON.stringify(lastScore.rank) !== JSON.stringify(newScore.rank);

    player.portrait = newPlayer.accounts
      .find((account) => account.platform === platform)?.portrait;

    if (hasChanged && player.current) {
      player.scores.push(player.current);
    }
    delete newScore.type;
    player.current = newScore as unknown as typeof player.current;
    player.lastUpdate = new Date().getTime();
    await player.save();
  }

  public getLocalFeed = async (req: Request, res: Response): Promise<Response> => {
    const { page = 1, time = 1 } = req.query;
    if (!req.session || !req.user) return res.status(401).send();
    const { battletag, bnetId } = req.user as { battletag: string, bnetId: number };
    const user = await User.findOne({
      battletag,
      bnetId,
    }).populate({
      path: 'following',
      options: {
        limit: +this.maxTagsPerRole,
        skip: (+page - 1) * +this.maxTagsPerRole,
      },
    });
    if (!user) return res.status(401).send();

    let finalFeed: Obj[] = [];

    const feeds = await Promise.all(Object.values(Roles).map(
      async (role, i) => this.makeFeed(role, +time, i === +page
        % Object.keys(Roles).length, +page, user.following as PlayerProps[]),
    ));
    feeds.forEach((feed) => {
      finalFeed = Utils.shuffle(finalFeed.concat(feed));
    });
    finalFeed = finalFeed.filter((v, i, o) => o.indexOf(v) === i);
    return res.status(200).json(finalFeed);
  }

  public getGlobalFeed = async (req: Request, res: Response): Promise<Response> => {
    const { page = 1, time = 1 } = req.query;
    let finalFeed: Obj[] = [];

    const feeds = await Promise.all(Object.values(Roles).map(
      async (role, i) => this.makeFeed(role, +time, i === 0, +page),
    ));
    feeds.forEach((feed) => {
      finalFeed = Utils.shuffle(finalFeed.concat(feed));
    });
    finalFeed = finalFeed.filter((v, i, o) => o.indexOf(v) === i);
    return res.json(finalFeed);
  }

  /**
   * Gets following players
   * @async
   * @param {String} req HTTP request data
   * @param {String} res HTTP response data
   */
  public async getFollowing(req: Request, res: Response): Promise<Response> {
    if (!req.session || !req.user) return res.status(401).send();
    const { battletag, bnetId } = req.user as { battletag: string, bnetId: number };
    const user = await User.findOne({
      battletag,
      bnetId,
    }).populate('following');
    if (!user) return res.status(401).send();
    const players: FollowedPlayer[] = [];
    (user.following as PlayerProps[]).forEach((player) => {
      if (!player.current) return;
      players.push({
        id: player._id.toHexString(),
        portrait: player.portrait || '',
        current: {
          endorsement: player.current.endorsement,
          role: heroes[player.current.main as keyof typeof heroes],
        },
        platform: overwatch.friendlyPlatforms[
          player.platform as keyof typeof overwatch.friendlyPlatforms
        ],
        tag: player.tag,
      });
    });
    return res.status(200).json(players);
  }

  /**
   * Gets detailed stats for player
   * @async
   * @param {String} req HTTP request data
   * @param {String} res HTTP response data
   */
  public getStats = async (req: Request, res: Response): Promise<Response> => {
    const { tagId } = req.params;

    const player = await Player.findById(tagId);
    if (!player) return res.status(404).send();

    const newScore = await this.makeScore(player.tag, player.platform, true, false);
    if (!newScore) return res.status(404).send();

    const stats = {
      tag: player.tag,
      platform: player.platform,
      portrait: player.portrait,
      scores: [] as Obj[],
      now: this.makeFriendlyScore(newScore),
    };

    if (player.current) {
      stats.scores.push(this.makeFriendlyScore({
        type: 'Obj',
        ...player.current,
        rank: {
          type: 'Obj',
          ...player.current.rank,
        },
        games: {
          type: 'Obj',
          ...player.current.games,
        },
      }));
    }

    if (player.scores.length > 0) {
      player.scores.reverse().forEach((score) => {
        stats.scores.push(this.makeFriendlyScore({
          type: 'Obj',
          date: score.date,
          main: score.main,
          endorsement: score.endorsement,
          rank: {
            type: 'Obj',
            damage: score.rank.damage,
            support: score.rank.support,
            tank: score.rank.tank,
          },
          games: {
            type: 'Obj',
            played: score.games?.played || 0,
            won: score.games?.won || 0,
          },
        }));
      });
    }
    return res.status(200).json(stats);
  }

  /**
   * Follows specific player
   * @async
   * @param req HTTP request data
   * @param res HTTP response data
   */
  public followPlayer = async (req: Request, res: Response): Promise<Response | void> => {
    const { tag, platform } = req.body;
    if (!req.session || !req.user) return res.status(401).send();
    const { battletag, bnetId } = req.user as { battletag: string, bnetId: number };

    const user = await User.findOne({
      battletag,
      bnetId,
    });
    if (!user) return res.status(400).send();

    const player = await Player.findOne({ tag, platform });
    if (player) {
      if (user.following.indexOf(player._id) !== -1) return res.status(400).send();
      user.following.push(player._id);
      await user.save();
      return res.status(200).send();
    }

    const newPlayer = await this.registerBattleTag(tag, platform);
    if (!newPlayer) return res.status(400).send();

    user.following.push(newPlayer._id);
    await user.save();
    return res.status(200).send();
  }
}

export default new PlayerController();
