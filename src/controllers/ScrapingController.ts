import { Request, Response } from 'express';
import axios from 'axios';
import cheerio from 'cheerio';
import overwatch from '../overwatch';

export interface SubAbilityUpdate {
  title: string,
  updates: string[]
}
export interface AbilityUpdate {
  title: string,
  icon: string,
  updates: SubAbilityUpdate[]
}
export interface HeroUpdate {
  hero: string,
  general: string[],
  abilities: AbilityUpdate[]
}
export interface HeroInfo {
  name: string;
  friendlyName: string;
  role: string;
  img?: string;
}

export interface Hero extends HeroInfo {
  difficulty: number,
  lore: string,
}


class ScrapingController {
  /**
   * Gets random Overwatch workshop code
   * @returns Workshop code
   */
  public async getRandomWorkshopCode(req: Request, res: Response): Promise<Response> {
    const page = await axios.get('https://workshop.codes/on-fire');
    const html = cheerio.load(page.data);
    const arr: string[] = [];
    html('.copy span').each((_, e) => {
      arr.push(e.attribs['data-copy']);
    });
    if (arr.length <= 0) return res.status(503).send();
    const index = Math.floor(Math.random() * arr.length);
    return res.status(200).json({ code: arr[index] });
  }

  /**
   * Gets information about a hero
   * @returns Hero information
   */
  public async getHeroInfo(req: Request, res: Response): Promise<Response> {
    const { hero } = req.params;
    const page = await axios
      .get(`https://playoverwatch.com/en-us/heroes/${overwatch.makeFriendlyName(hero)}/`);
    const html = cheerio.load(page.data);
    const currentHero = {} as Hero;
    html('.hero-pose-name').each((_, e) => {
      currentHero.friendlyName = e.firstChild.data as string;
    });
    html('.hero-detail-role-name').each((_, e) => {
      currentHero.role = overwatch.makeFriendlyName(e.firstChild.data as string);
    });
    html('.hero-detail-description').each((_, e) => {
      currentHero.lore = e.firstChild.data as string;
    });
    currentHero.difficulty = 3;
    html('.star.m-empty').each(() => {
      currentHero.difficulty -= 1;
    });
    currentHero.name = hero;
    return res.status(200).json(currentHero);
  }

  /**
   * Gets all heroes updates from the last month
   * @returns Heroes updates
   */
  public async getLatestHeroesUpdate(req: Request, res: Response): Promise<Response> {
    const page = await axios.get('https://playoverwatch.com/en-us/news/patch-notes/live/');
    const html = cheerio.load(page.data);
    const arr: HeroUpdate[] = [];
    html('.PatchNotes-patch .PatchNotesHeroUpdate').each((_, heroUpdate) => {
      const currentUpdate: HeroUpdate = {} as HeroUpdate;
      currentUpdate.abilities = [];
      currentUpdate.general = [];

      currentUpdate.hero = heroUpdate
        .firstChild // PatchNotesHeroUpdate-header
        .lastChild // PatchNotesHeroUpdate-name
        .firstChild // Text
        .data?.toLowerCase() as string;

      heroUpdate
        .lastChild // PatchNotesHeroUpdate-body
        .children // PatchNotesHeroUpdate-abilitiesList
        .forEach((list) => {
          switch (list.attribs?.class) {
            case 'PatchNotesHeroUpdate-generalUpdates':
              list
                .firstChild // <ul>
                .children // <li>
                .forEach((update) => {
                  if (!update.children) return;
                  currentUpdate.general.push(update.children[0].data as string);
                });
              break;
            case 'PatchNotesHeroUpdate-abilitiesList':
              list.children.forEach((update) => {
                const currentAbilityUpdate = {} as AbilityUpdate;
                currentAbilityUpdate.icon = update
                  .firstChild // PatchNotesAbilityUpdate
                  .firstChild // PatchNotesAbilityUpdate-icon-container
                  .attribs.src;
                currentAbilityUpdate.title = update
                  .lastChild // PatchNotesAbilityUpdate-text
                  .firstChild // PatchNotesAbilityUpdate-name
                  .firstChild // Text
                  .data as string;
                currentAbilityUpdate.updates = [];
                let currentSubAbilityUpdate: SubAbilityUpdate = {
                  title: '',
                  updates: [],
                };
                update
                  .lastChild // PatchNotesAbilityUpdate-text
                  .lastChild // PatchNotesAbilityUpdate-detailList
                  .children // <ul>
                  .forEach((subUpdate) => {
                    if (subUpdate.type !== 'tag') return;
                    switch (subUpdate.name) {
                      case 'p':
                        currentSubAbilityUpdate.title = subUpdate
                          .firstChild.data as string;
                        break;
                      case 'ul':
                        subUpdate.children.forEach((listItem) => {
                          if (!listItem.children) return;
                          currentSubAbilityUpdate.updates.push(
                                      listItem.firstChild.data as string,
                          );
                        });
                        currentAbilityUpdate.updates.push(currentSubAbilityUpdate);
                        currentSubAbilityUpdate = {
                          title: '',
                          updates: [],
                        };
                        break;
                      default:
                        break;
                    }
                  });
                currentUpdate.abilities.push(currentAbilityUpdate);
              });
              break;
            default:
              break;
          }
        });
      if (currentUpdate.hero) arr.push(currentUpdate);
    });
    return res.status(200).json(arr);
  }

  /**
   * Gets every hero and their class
   * @returns Heroes list
   */
  public async getAllHeroes(req: Request, res: Response): Promise<Response> {
    const page = await axios.get('https://playoverwatch.com/en-us/heroes');
    const html = cheerio.load(page.data);
    const heroes: HeroInfo[] = [];
    html('.heroes-index.hero-selector .hero-portrait-detailed').each((_, e) => {
      const friendlyName = e
        .lastChild // <span class="container">
        .lastChild // <span class="portrait-title">
        .firstChild // Text
        .data as string;
      const name = overwatch.makeFriendlyName(friendlyName);
      heroes.push({
        name,
        friendlyName,
        role: overwatch.makeFriendlyName(e
          .lastChild // <span class="container">
          .firstChild // <span class="icon">
          .firstChild // <svg class="icon">
          .firstChild // SVG
          .attribs.href.split('#')[1] as string),
        img: `https://d1u1mce87gyfbn.cloudfront.net/hero/${name}/hero-select-portrait.png`,
      });
    });
    return res.status(200).json(heroes);
  }
}

export default new ScrapingController();
