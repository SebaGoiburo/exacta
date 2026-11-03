import * as migration_20261029_114539_initial from './20261029_114539_initial';
import * as migration_20261029_121545_integrations from './20261029_121545_integrations';
import * as migration_20261102_232253_phase1 from './20261102_232253_phase1';
import * as migration_20261103_145803_whatsapp from './20261103_145803_whatsapp';

export const migrations = [
  {
    up: migration_20261029_114539_initial.up,
    down: migration_20261029_114539_initial.down,
    name: '20261029_114539_initial',
  },
  {
    up: migration_20261029_121545_integrations.up,
    down: migration_20261029_121545_integrations.down,
    name: '20261029_121545_integrations',
  },
  {
    up: migration_20261102_232253_phase1.up,
    down: migration_20261102_232253_phase1.down,
    name: '20261102_232253_phase1',
  },
  {
    up: migration_20261103_145803_whatsapp.up,
    down: migration_20261103_145803_whatsapp.down,
    name: '20261103_145803_whatsapp'
  },
];
