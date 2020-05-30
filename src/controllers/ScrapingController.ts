import { Request, Response } from 'express';
import axios from 'axios';
import cheerio from 'cheerio';

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
   * Gets all heroes updates from the last month
   * @returns Heroes updates
   */
  public async getLatestHeroesUpdate(req: Request, res: Response): Promise<Response> {
    const page = await axios.get('https://playoverwatch.com/en-us/news/patch-notes/live/');
    const html = cheerio.load(page.data);
    const arr: HeroUpdate[] = [];
    html('.PatchNotes-body').each((_, e) => {
      e.children.forEach((patchNote) => {
        patchNote.children.forEach((section) => {
          if (section.attribs.class === 'PatchNotes-section .PatchNotes-section-hero_update') {
            section.children.forEach((heroUpdate) => {
              const currentUpdate: HeroUpdate = {} as HeroUpdate;
              currentUpdate.abilities = [];
              currentUpdate.general = [];

              heroUpdate.children.forEach((component) => {
                switch (component.attribs?.class) {
                  case 'PatchNotesHeroUpdate-header':
                    currentUpdate.hero = component
                      .children[1]?.children[0]?.data?.toLowerCase() as string;
                    break;
                  case 'PatchNotesHeroUpdate-body':
                    component.children.forEach((list) => {
                      switch (list.attribs?.class) {
                        case 'PatchNotesHeroUpdate-generalUpdates':
                          list.children[0].children.forEach((update) => {
                            if (!update.children) return;
                            currentUpdate.general.push(update.children[0].data as string);
                          });
                          break;
                        case 'PatchNotesHeroUpdate-abilitiesList':
                          list.children.forEach((update) => {
                            const currentAbilityUpdate: AbilityUpdate = {} as AbilityUpdate;
                            currentAbilityUpdate.icon = update
                              .children[0].children[0].attribs.src;
                            currentAbilityUpdate.title = update
                              .children[1].children[0].children[0].data as string;
                            currentAbilityUpdate.updates = [];
                            let currentSubAbilityUpdate: SubAbilityUpdate = {
                              title: '',
                              updates: [],
                            };
                            update.children[1].children[1].children.forEach((subUpdate) => {
                              if (subUpdate.type !== 'tag') return;
                              switch (subUpdate.name) {
                                case 'p':
                                  currentSubAbilityUpdate.title = subUpdate
                                    .children[0].data as string;
                                  break;
                                case 'ul':
                                  subUpdate.children.forEach((listItem) => {
                                    if (!listItem.children) return;
                                    currentSubAbilityUpdate.updates.push(
                                      listItem.children[0].data as string,
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
                    break;
                  default:
                    break;
                }
              });
              if (currentUpdate.hero) arr.push(currentUpdate);
            });
          }
        });
      });
    });
    return res.status(200).json(arr);
  }
}

export default new ScrapingController();
