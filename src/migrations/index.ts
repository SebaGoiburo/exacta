import * as migration_20261029_114539_initial from './20261029_114539_initial';
import * as migration_20261029_121545_integrations from './20261029_121545_integrations';
import * as migration_20261102_232253_phase1 from './20261102_232253_phase1';
import * as migration_20261103_145803_whatsapp from './20261103_145803_whatsapp';
import * as migration_20261104_142821_content_engine from './20261104_142821_content_engine';
import * as migration_20261112_223043_prospect_generator from './20261112_223043_prospect_generator';
import * as migration_20261113_203040_whatsapp_audio_filters from './20261113_203040_whatsapp_audio_filters';

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
    name: '20261103_145803_whatsapp',
  },
  {
    up: migration_20261104_142821_content_engine.up,
    down: migration_20261104_142821_content_engine.down,
    name: '20261104_142821_content_engine',
  },
  {
    up: migration_20261112_223043_prospect_generator.up,
    down: migration_20261112_223043_prospect_generator.down,
    name: '20261112_223043_prospect_generator',
  },
  {
    up: migration_20261113_203040_whatsapp_audio_filters.up,
    down: migration_20261113_203040_whatsapp_audio_filters.down,
    name: '20261113_203040_whatsapp_audio_filters'
  },
];
