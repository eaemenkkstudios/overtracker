import { Request, Response } from 'express';
import axios, { AxiosResponse } from 'axios';
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
  raw_name: string;
  name: string;
  role: string;
  img?: string;
}

export interface Hero extends HeroInfo {
  difficulty: number,
  lore: string,
}

export interface CodeInfo {
  name: string;
  code: string;
}

class ScrapingController {
  /**
   * Gets random Overwatch workshop code (does the scraping)
   * @returns Workshop code
   */
  public async getRandomWorkshopCodeScraping(): Promise<CodeInfo | undefined> {
    let page: AxiosResponse;
    try {
      page = await axios.get('https://workshop.codes/on-fire');
    } catch (e) {
      return undefined;
    }

    const arr: CodeInfo[] = [];

    const html = cheerio.load(page.data);
    html('article.item').each((_, e) => {
      const code = {} as CodeInfo;
      e.children.forEach((info) => {
        switch (info.attribs?.class) {
          case 'item__title':
            info.children.forEach((child) => {
              // <a>
              if (child.tagName === 'a'
                && child.children.length === 1) {
                code.name = (child
                  .firstChild // Text
                  .data as string).trim();
              }
            });
            break;
          case 'item__code':
            info.children.forEach((child) => {
              // <span class="copy">
              if (child.tagName === 'span') {
                child.children.forEach((subChild) => {
                  // <span>
                  if (subChild.tagName === 'span') {
                    code.code = subChild
                      .firstChild // Text
                      .data as string;
                  }
                });
              }
            });
            break;
          default:
            break;
        }
      });
      arr.push(code);
    });
    if (arr.length <= 0) return undefined;
    const index = Math.floor(Math.random() * arr.length);
    return arr[index];
  }

  /**
   * Gets random Overwatch workshop code
   * @returns Workshop code
   */
  public getRandomWorkshopCode = async (req: Request, res: Response): Promise<Response> => {
    const code = await this.getAllHeroesScraping();
    if (code) return res.status(200).json({ code });
    return res.status(400).send();
  }

  /**
   * Gets information about a hero
   * @returns Hero information
   */
  public async getHeroInfo(req: Request, res: Response): Promise<Response> {
    const { hero } = req.params;
    let page: AxiosResponse;
    try {
      page = await axios
        .get(`https://playoverwatch.com/en-us/heroes/${hero}/`);
    } catch (e) {
      return res.status(400).send();
    }
    const html = cheerio.load(page.data);
    const currentHero = {} as Hero;
    html('.hero-pose-name').each((_, e) => {
      currentHero.name = e.firstChild.data as string;
    });
    html('.hero-detail-role-name').each((_, e) => {
      currentHero.role = overwatch.makeRawName(e.firstChild.data as string);
    });
    html('.hero-detail-description').each((_, e) => {
      currentHero.lore = e.firstChild.data as string;
    });
    currentHero.difficulty = 3;
    html('.star.m-empty').each(() => {
      currentHero.difficulty -= 1;
    });
    currentHero.raw_name = hero;
    return res.status(200).json(currentHero);
  }


  /**
   * Gets all heroes updates from the last month (does the scraping)
   * @returns Heroes updates
   */
  public async getLatestHeroesUpdateScraping(): Promise<HeroUpdate[] | undefined> {
    let page: AxiosResponse;
    try {
      page = await axios.get('https://playoverwatch.com/en-us/news/patch-notes/live/');
    } catch (e) {
      return undefined;
    }
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
    return arr;
  }

  /**
   * Gets all heroes updates from the last month
   * @returns Heroes updates
   */
  public getLatestHeroesUpdate = async (req: Request, res: Response): Promise<Response> => {
    const updates = await this.getLatestHeroesUpdateScraping();
    if (updates) return res.status(200).json(updates);
    return res.status(400).send();
  }

  /**
   * Gets every hero and their class (does the scraping)
   * @returns Heroes list
   */
  public async getAllHeroesScraping(): Promise<HeroInfo[] | undefined> {
    let page: AxiosResponse;
    try {
      page = await axios.get('https://playoverwatch.com/en-us/heroes');
    } catch (e) {
      return undefined;
    }
    const html = cheerio.load(page.data);
    const heroes: HeroInfo[] = [];
    html('.heroes-index.hero-selector .hero-portrait-detailed').each((_, e) => {
      const name = e
        .lastChild // <span class="container">
        .lastChild // <span class="portrait-title">
        .firstChild // Text
        .data as string;
      const raw_name = overwatch.makeRawName(name);
      heroes.push({
        raw_name,
        name,
        role: overwatch.makeRawName(e
          .lastChild // <span class="container">
          .firstChild // <span class="icon">
          .firstChild // <svg class="icon">
          .firstChild // SVG
          .attribs.href.split('#')[1] as string),
        img: `https://d1u1mce87gyfbn.cloudfront.net/hero/${raw_name}/hero-select-portrait.png`,
      });
    });
    return heroes;
  }

  /**
   * Gets every hero and their class
   * @returns Heroes list
   */
  public getAllHeroes = async (req: Request, res: Response): Promise<Response> => {
    const heroes = await this.getAllHeroesScraping();
    if (heroes) return res.status(200).json(heroes);
    return res.status(400).send();
  }
}
export default new ScrapingController();
