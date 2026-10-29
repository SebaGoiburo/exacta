import * as migration_20261029_114539_initial from './20261029_114539_initial';
import * as migration_20261029_121545_integrations from './20261029_121545_integrations';

export const migrations = [
  {
    up: migration_20261029_114539_initial.up,
    down: migration_20261029_114539_initial.down,
    name: '20261029_114539_initial',
  },
  {
    up: migration_20261029_121545_integrations.up,
    down: migration_20261029_121545_integrations.down,
    name: '20261029_121545_integrations'
  },
];
