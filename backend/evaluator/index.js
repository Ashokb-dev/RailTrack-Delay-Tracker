/**
 * Phase 6B Evaluator Module Exports
 */

const config = require('./config');
const logger = require('./logger');
const matcher = require('./matcher');
const metrics = require('./metrics');

module.exports = {
  config,
  ...logger,
  ...matcher,
  ...metrics
};
