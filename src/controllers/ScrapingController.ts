import { Request, Response } from 'express';
import axios from 'axios';
import cheerio from 'cheerio';

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
   * Gets random Overwatch workshop code
   * @returns Workshop code
   */
  public async getLatestHeroesUpdate(req: Request, res: Response): Promise<Response> {
    const page = await axios.get('https://playoverwatch.com/en-us/news/patch-notes/live/');
    return res.status(200).send();
  }
}

export default new ScrapingController();
