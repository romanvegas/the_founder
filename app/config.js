const config = {
  // SECONDS_PER_WEEK: 6 * 20,
  SECONDS_PER_WEEK: 10,
  WEEKS_PER_MONTH: 4,

  // board
  STARTING_PROFIT_TARGET: 100000,
  DESIRED_GROWTH: 0.12,
  GRACE_YEARS: 2,
  BOARD_STARTING_HAPPINESS: 15,
  GAME_OVER_HAPPINESS: -20,

  // hype
  HYPE_DECAY_RATE: 0.98,
  HYPE_SCALE: 1/100,

  // product
  PROGRESS_PER_DIFFICULTY: 100,
  REVENUE_DECAY: 0.9,
  NEW_PRODUCT_MULTIPLIER: 1.5,
  BASE_REVENUE_PER_SHARE: 1000,
  REVENUE_WEEK_SCALE: 12,

  // hiring
  SCORE_RANGE: 6,
  BASE_PROB: 0.8,
  NEGOTIATION_LOWER_SALARY_EFFECT: 0.9,
  NEGOTIATION_HIGHER_SALARY_EFFECT: 1.1,

  // worker
  PERK_SALARY_REDUCE_PERCENT: 0.01,
  GROWTH_PROB: 0.04,
  BASE_GROWTH_RATE: 0.01,
  BASE_HAPPINESS_MODIFIER: 5,
  MIN_BURNOUT_DAYS: 2,
  MAX_BURNOUT_DAYS: 4,

  // company
  BASE_BURNOUT_RATE: 0.0002,
  BASE_TAX_RATE: 0.3,

  // market
  BASE_CAPTURE_COST: 1,
  INCOME_DISTRIBUTION: [0.65, 0.2, 0.125, 0.025],
  TILE_PROBS: {
    influencer: 0.06,
    empty: 0.3
  },
  MAX_TURNS: 10,

  // ai
  TILE_VALUES: {
    income: 3,
    influencer: 4
  },
  TASK_VALUES: {
    capture: 1,
    defend: 0.1
  }
};

export default config;
