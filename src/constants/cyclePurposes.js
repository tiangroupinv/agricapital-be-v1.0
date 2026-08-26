/**
 * Cycle purposes (what the funding is for)
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.2
 */
const CYCLE_PURPOSES = {
  FEEDS: 'feeds',
  VACCINES: 'vaccines',
  SEEDS: 'seeds',
  FERTILIZER: 'fertilizer',
  OTHER: 'other',
};

const CYCLE_PURPOSES_LIST = Object.values(CYCLE_PURPOSES);

module.exports = {
  CYCLE_PURPOSES,
  CYCLE_PURPOSES_LIST,
};
