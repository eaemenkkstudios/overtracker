// Type definitions for oversmash 1.6
// Project: https://github.com/filp/oversmash
// Definitions by: Pedro Campos <https://github.com/cdias900>
//                 Thiago <https://github.com/thzoid>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 3.9

declare module 'oversmash' {
  export enum NormalizeNamesAs {
    snake = 'snake',
    camel = 'camel'
  }

  export enum Heroes {
      all = 'all',
      ana = 'ana',
      ashe = 'ashe',
      baptiste = 'baptiste',
      bastion = 'bastion',
      brigitte = 'brigitte',
      dva = 'dva',
      doomfist = 'doomfist',
      echo = 'echo',
      genji = 'genji',
      hanzo = 'hanzo',
      junkrat = 'junkrat',
      lucio = 'lucio',
      mccree = 'mccree',
      mei = 'mei',
      mercy = 'mercy',
      moira = 'moira',
      orisa = 'orisa',
      pharah = 'pharah',
      reaper = 'reaper',
      reinhardt = 'reinhardt',
      roadhog = 'roadhog',
      sigma = 'sigma',
      soldier76 = 'soldier76',
      sombra = 'sombra',
      symmetra = 'symmetra',
      torbjorn = 'torbjorn',
      tracer = 'tracer',
      widowmaker = 'idowmaker',
      winston = 'winston',
      wreckingball = 'wreckingball',
      zarya = 'zarya',
      zenyatta = 'zenyatta'
  }

  export type Header = {
      [key: string]: string;
  }

  export type RequestOptions = {
      baseURL: string;
      headers: Header;
  }

  export type CallerOptions = {
      normalizeNames: boolean;
      normalizeNamesAs: NormalizeNamesAs;
      normalizeValues: boolean;
      percentsToInts: boolean;
      portraitUrlTemplate: string;
      defaultPlatform: string;
      requestOptions: RequestOptions;
  }

  export type Account = {
      level: number;
      portrait: string;
      displayName?: string;
      platform: string;
      public: boolean;
  }

  export type Player = {
      name?: string;
      nameEscaped: string;
      nameEscapedUrl: string;
      accounts: Account[];
  }

  export type CompetitiveRank = {
      support?: number;
      tank?: number;
      damage?: number;
  }

  export type Achievement = {
      name: string;
      achieved: boolean;
  }

  export type Statistic = {
     [key: string]: string | number | null;
  }

  export type Game = {
      gamesWon: number;
      timePlayed: string;
  }

  export type Hero = {
      name: string;
      combat?: Statistic;
      game?: Game;
      best?: Statistic;
      misc?: Statistic;
      awards?: Statistic;
      hero?: Statistic;
      assists?: Statistic;
      average?: Statistic;
      rawName: string;
  }

  export type GameMode = {
      [K in keyof typeof Heroes]: Hero;
  }

  export type Stats = {
      competitiveRank?: CompetitiveRank;
      endorsementLevel?: number;
      gamesWon?: number;
      achievements: Achievement[];
      quickplay: GameMode;
      competitive: GameMode;
  }

  export type PlayerStats = {
      name?: string;
      nameEscaped: string;
      nameEscapedUrl?: string;
      region?: string;
      platform: string;
      stats: Stats;
  }

  function main(callerOptions?: CallerOptions): {
      readonly options: CallerOptions;
      player(name: string): Promise<Player>;
      playerStats(name: string, platform?: string): Promise<PlayerStats>;
  };

  export default main;
}
