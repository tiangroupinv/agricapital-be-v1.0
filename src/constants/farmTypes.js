/**
 * Farm types for farmer profiles
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.1 (farmerProfile)
 */
const FARM_TYPES = {
  CROP: 'crop',
  LIVESTOCK: 'livestock',
};

const FARM_TYPES_LIST = Object.values(FARM_TYPES);

module.exports = {
  FARM_TYPES,
  FARM_TYPES_LIST,
};
