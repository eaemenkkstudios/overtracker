import { Response, Request } from 'express';
import oversmash from 'oversmash';
import overwatch, { Roles, Obj } from '../overwatch';
import Utils from '../utils/Utils';
import Player, { PlayerProps, PlayerDoc } from '../models/Player';
import heroes from '../heroes.json';
import { UserDoc } from '../models/User';

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
  public maxTagsPerRole: string;

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
  }

  public async makeScore(
    tag: string,
    platform: string,
    extended: boolean,
    forceUpdate: boolean,
  ): Promise<Obj | undefined> {
    const score: Obj = {
      type: 'Obj',
      date: new Date().getTime(),
      ...Utils.cloneObject(extended ? this.scoreCardExtended : this.scoreCard),
    };
    const success = await overwatch.fillObject(score, tag, platform, 1, forceUpdate);
    return success ? score : undefined;
  }

  public async makeFeed(
    role: string,
    time: number,
    generic: boolean,
    page: number,
    customList: PlayerProps[],
  ): Promise<Obj[]> {
    const finalCards: Obj[] = [];
    let players: PlayerProps[] = [];
    if (customList) {
      players = customList;
    } else {
      players = await Player.find();
      // players = (await firebase
      //   .database()
      //   .ref('battletags')
      //   .orderByChild(`current/rank/${role}`)
      //   .limitToLast(+this.maxTagsPerRole * page)
      //   .once('value')).val();
      // Object.keys(players).forEach((key, i) => {
      //   if (i < +this.maxTagsPerRole * (page - 1)) delete players[key];
      // });
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
    if ((score.main as Obj).type !== 'Obj') {
      score.main = {
        type: 'Obj',
        hero: score.main,
        role: heroes[score.main as keyof typeof heroes],
      };
    }

    Object.keys(score.rank).forEach((rank) => {
      const img = overwatch.getRankImageURL((score.rank as Obj)[rank] as number);
      (score.rank as Obj)[rank] = {
        type: 'Obj',
        sr: (score.rank as Obj)[rank],
        img,
      };
    });
    return score;
  }

  /**
   * Registers the player in the database
   * @param tag Player's battletag
   * @param platform Player's platform
   * @returns The database referece or `undefined`
   */
  public async registerBattleTag(tag: string, platform: string): Promise<any | undefined> {
    platform = platform || 'pc';
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
    // return firebase.database().ref('battletags').push(finalStats);
  }

  /**
   * Gets all of the players that haven't been updated in more than 12hrs
   * @returns Array of outdated players
   */
  public async getOutdatedPlayers(): Promise<PlayerDoc[]> {
    const currentTime = new Date().getTime();
    // 60 * 60 * 24 * 1000 / 4 = 8640000 / 4 = 24hrs / 4 = 6hrs
    return Player.find({ lastUpdate: { $lte: currentTime - (8640000 / 4) } });
    // return firebase
    //   .database()
    //   .ref('battletags')
    //   .once('value', (snapshot) => {
    //     if (snapshot.val()) {
    //       Object.keys(snapshot.val()).forEach((player) => {
    //         if (snapshot.val()[player].current) {
    //           if (currentTime - snapshot.val()[player].lastUpdate >= 8640000 / 24) {
    //             outdatedPlayers.push({
    //               tag: snapshot.val()[player].tag,
    //               platform: snapshot.val()[player].platform,
    //             });
    //           }
    //         }
    //       });
    //     }
    //   })
    //   .then(() => outdatedPlayers);
  }

  /**
   * Updates the score of the player
   * @param tag Player's battletag
   * @param platform Player's platform
   */
  public async updatePlayer(tag: string, platform: string): Promise<void> {
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

    // await firebase
    //   .database()
    //   .ref('battletags')
    //   .orderByChild('tag')
    //   .equalTo(tag)
    //   .once('value', async (snapshot) => {
    //     const lastScore = fVal(snapshot.val()).current;
    //     const hasChanged = JSON.stringify(lastScore.games) !== JSON.stringify(newScore.games)
    //     || JSON.stringify(lastScore.rank) !== JSON.stringify(newScore.rank);
    //     let newStats = {};
    //     if (fVal(snapshot.val()).scores) {
    //       newStats = {
    //         [fKey(snapshot.val())]: {
    //           tag,
    //           platform,
    //           portrait: newPlayer.accounts
    //             .find((account) => account.platform === platform).portrait,
    //           scores: hasChanged ? [
    //             ...fVal(snapshot.val()).scores,
    //             fVal(snapshot.val()).current,
    //           ] : [...fVal(snapshot.val()).scores],
    //           lastUpdate: new Date().getTime(),
    //           current: newScore,
    //         },
    //       };
    //     } else {
    //       newStats = {
    //         [fKey(snapshot.val())]: {
    //           tag,
    //           platform,
    //           portrait: newPlayer.accounts
    //             .find((account) => account.platform === platform).portrait,
    //           scores: hasChanged ? [fVal(snapshot.val()).current] : [],
    //           lastUpdate: new Date().getTime(),
    //           current: newScore,
    //         },
    //       };
    //     }
    //     await snapshot.ref.update(newStats);
    //   });
  }

  public async getLocalFeed(req: Request, res: Response): Promise<Response | void> {
    const { page = 1, time = 1 } = req.query;
    const { authorization } = req.headers;
    let finalFeed: Obj[] = [];

    const playersList = {};
    const auth = await firebase.auth().verifyIdToken(authorization)
      .catch(() => res.status(400).send());

    if (auth.uid) {
      const following = (await firebase
        .database()
        .ref('accounts')
        .child(auth.uid)
        .child('following')
        .orderByKey()
        .limitToLast(+this.maxTagsPerRole * page)
        .once('value')).val();
      if (following) {
        await Promise.all(Object.values(following).map(async (id, i) => {
          if (i >= +this.maxTagsPerRole) return;
          return firebase
            .database()
            .ref('battletags')
            .orderByKey()
            .equalTo(id)
            .once('value', (player) => {
              playersList[fKey(player.val())] = fVal(player.val());
            });
        }));
      }
      const feeds = await Promise.all(Object.values(Roles).map(
        async (role, i) => this.makeFeed(role, +time, i === +page
          % Object.keys(Roles).length, +page, playersList),
      ));
      feeds.forEach((feed) => {
        finalFeed = Utils.shuffle(finalFeed.concat(feed));
      });
      finalFeed = finalFeed.filter((v, i, o) => o.indexOf(v) === i);
      return res.json(finalFeed);
    }
  }

  public async getGlobalFeed(req: Request, res: Response): Promise<Response> {
    let { page, time } = req.query;
    time = time || 1;
    page = page || 1;
    let finalFeed = [];

    const feeds = await Promise.all(Object.values(Roles).map(
      async (role) => makeFeed(role, time, true, page),
    ));
    feeds.forEach((feed) => {
      finalFeed = shuffle(finalFeed.concat(feed));
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
    const { session } = req;
    if (!session) return res.status(401).send();
    const user = session.user as UserDoc;
    await user.populate('following').execPopulate();
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

    // firebase.auth().verifyIdToken(token)
    //   .then(async (userData) => {
    //     firebase
    //       .database()
    //       .ref('accounts')
    //       .child(userData.uid)
    //       .child('following')
    //       .once('value', (snapshot) => {
    //         firebase
    //           .database()
    //           .ref('battletags')
    //           .once('value', (snap) => {
    //             const followedPlayers = snapshot.val();
    //             if (!followedPlayers) return;
    //             const playersInfo = snap.val();
    //             const tagIds = Object.keys(followedPlayers).map((id) => followedPlayers[id]);
    //             const players = [];
    //             Object.keys(playersInfo).forEach((player) => {
    //               if (!playersInfo[player].current) return;
    //               if (tagIds.indexOf(player) !== -1) {
    //                 players.push({
    //                   id: player,
    //                   portrait: playersInfo[player].portrait,
    //                   current: {
    //                     endorsement: playersInfo[player].current.endorsement,
    //                     role: overwatch.heroes[playersInfo[player].current.main],
    //                   },
    //                   platform: overwatch.friendlyPlatforms[(playersInfo[player].platform)],
    //                   tag: playersInfo[player].tag,
    //                 });
    //               }
    //             });
    //             res.status(200).json(players);
    //           });
    //       })
    //       .then((snap) => {
    //         if (!snap.val()) res.status(200).json([]);
    //       });
    //   })
    //   .catch(() => res.status(401).send());
  }

  /**
   * Gets detailed stats for player
   * @async
   * @param {String} req HTTP request data
   * @param {String} res HTTP response data
   */
  public async getStats(req: Request, res: Response): Promise<Response | void> {
    const token = req.headers.authorization;
    const { tagId } = req.params;
    firebase.auth().verifyIdToken(token)
      .then(async () => {
        await firebase
          .database()
          .ref('battletags')
          .orderByKey()
          .equalTo(tagId)
          .once('value', async (snapshot) => {
            if (!snapshot.val()) return res.status(400).send();
            const { tag, platform, portrait } = fVal(snapshot.val());
            const newScore = await this.makeScore(tag, platform, true, false);
            if (!newScore) return res.status(404).send();
            const stats = {
              tag,
              platform,
              portrait,
              scores: [] as Obj[],
              now: this.makeFriendlyScore(newScore),
            };
            if (fVal(snapshot.val()).current) {
              stats.scores.push(this.makeFriendlyScore(fVal(snapshot.val()).current));
            }
            if (fVal(snapshot.val()).scores) {
              fVal(snapshot.val()).scores.reverse().forEach((score) => {
                stats.scores.push(this.makeFriendlyScore(score));
              });
            }
            res.status(200).json(stats);
          });
      })
      .catch(() => res.status(401).send());
  }

  /**
   * Follows specific player
   * @async
   * @param req HTTP request data
   * @param res HTTP response data
   */
  public async followPlayer(req: Request, res: Response): Promise<Response | void> {
    const token = req.headers.authorization;
    const { tag, platform } = req.body;
    firebase.auth().verifyIdToken(token)
      .then(async (userData) => {
        firebase.database().ref('battletags')
          .orderByChild('tag')
          .equalTo(tag)
          .once('value', async (snapshot) => {
            if (snapshot.val()) {
              const playerId = fKey(snapshot.val());
              await firebase.database().ref('accounts')
                .child(userData.uid)
                .child('following')
                .orderByValue()
                .equalTo(playerId)
                .once('value', async (snap) => {
                  if (snap.val()) return res.status(400).send();
                  await firebase.database()
                    .ref('accounts')
                    .child(userData.uid)
                    .child('following')
                    .push(playerId);
                  return res.status(200).send();
                });
            } else {
              const newPlayer = await this.registerBattleTag(tag, platform);
              if (!newPlayer) return res.status(400).send();
              await firebase
                .database()
                .ref('accounts')
                .child(userData.uid)
                .child('following')
                .push(newPlayer.key);
              return res.status(201).send();
            }
          });
      })
      .catch(() => res.status(401).send());
  }
}

export default new PlayerController();
