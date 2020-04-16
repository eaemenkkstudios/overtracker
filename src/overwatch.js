module.exports = {
  player: {
    ENDORSEMENT: {
      PREVIOUS: 'endorsement_previous',
      CURRENT: 'endorsement_current',
      UPDATED: 'endorsement_updated',
    },
    SR: {
      MAIN: {
        PREVIOUS: 'sr_main_previous',
        CURRENT: 'sr_main_current',
        SLOPE: 'sr_main_slope',
        UPDATED: 'sr_main_updated',
      },
      HIGHEST: {
        PREVIOUS: 'sr_highest_previous',
        CURRENT: 'sr_highest_current',
        SLOPE: 'sr_highest_slope',
        UPDATED: 'sr_highest_updated',
      },
      SUPPORT: {
        PREVIOUS: 'sr_support_previous',
        CURRENT: 'sr_support_current',
        SLOPE: 'sr_support_slope',
        UPDATED: 'sr_support_updated',
      },
      TANK: {
        PREVIOUS: 'sr_tank_previous',
        CURRENT: 'sr_tank_current',
        SLOPE: 'sr_tank_slope',
        UPDATED: 'sr_tank_updated',
      },
      DAMAGE: {
        PREVIOUS: 'sr_damage_previous',
        CURRENT: 'sr_damage_current',
        SLOPE: 'sr_damage_slope',
        UPDATED: 'sr_damage_updated',
      },
    },
    MATCHES: {
      PLAYED: {
        PREVIOUS: 'matches_played_previous',
        CURRENT: 'matches_played_current',
        UPDATED: 'matches_played_updated',
      },
      WON: {
        PREVIOUS: 'matches_won_previous',
        CURRENT: 'matches_won_current',
        UPDATED: 'matches_won_updated',
      },
    },
    MAIN: {
      PREVIOUS: 'main_previous',
      CURRENT: 'main_current',
      TIME: {
        CURRENT: 'main_time_current',
        UPDATED: 'main_time_updated',
      },
      UPDATED: 'sr_main_updated',
    },
    PROFILE: {
      TAG: 'tag',
      PLATFORM: 'platform',
    },
  },
  friendlyPlatforms: {
    pc: 'PC',
    psn: 'PlayStation Network',
    xbl: 'Xbox Live',
  },
  /**
   * Gets the image URL of the player's rank
   * @param {Number} rank Player's SR
   * @returns {String} Image URL
   */
  getRankImageURL(rank) {
    const baseUrl = 'https://d1u1mce87gyfbn.cloudfront.net/game/rank-icons/rank-';
    const suffix = 'Tier.png';
    let tier = '';
    if (rank < 1) return undefined;
    if (rank < 1500) {
      tier = 'Bronze';
    } else if (rank < 2000) {
      tier = 'Silver';
    } else if (rank < 2500) {
      tier = 'Gold';
    } else if (rank < 3000) {
      tier = 'Platinum';
    } else if (rank < 3500) {
      tier = 'Diamond';
    } else if (rank < 4000) {
      tier = 'Master';
    } else {
      tier = 'Grandmaster';
    }
    return baseUrl + tier + suffix;
  },
};
