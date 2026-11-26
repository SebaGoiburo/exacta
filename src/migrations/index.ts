import * as migration_20261029_114539_initial from './20261029_114539_initial';
import * as migration_20261029_121545_integrations from './20261029_121545_integrations';
import * as migration_20261102_232253_phase1 from './20261102_232253_phase1';
import * as migration_20261103_145803_whatsapp from './20261103_145803_whatsapp';
import * as migration_20261104_142821_content_engine from './20261104_142821_content_engine';
import * as migration_20261112_223043_prospect_generator from './20261112_223043_prospect_generator';
import * as migration_20261113_203040_whatsapp_audio_filters from './20261113_203040_whatsapp_audio_filters';
import * as migration_20261113_223222_whatsapp_meta_type from './20261113_223222_whatsapp_meta_type';
import * as migration_20261116_144935_report_reading from './20261116_144935_report_reading';
import * as migration_20261116_152621_batch_research_ai_usage from './20261116_152621_batch_research_ai_usage';
import * as migration_20261116_180317_payment_terms from './20261116_180317_payment_terms';
import * as migration_20261117_150524_offer_benefits from './20261117_150524_offer_benefits';
import * as migration_20261123_185841_instagram_auto_replies from './20261123_185841_instagram_auto_replies';
import * as migration_20261123_192406_instagram_unified_login from './20261123_192406_instagram_unified_login';
import * as migration_20261126_122331_ia_para_humanos from './20261126_122331_ia_para_humanos';

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
    name: '20261113_203040_whatsapp_audio_filters',
  },
  {
    up: migration_20261113_223222_whatsapp_meta_type.up,
    down: migration_20261113_223222_whatsapp_meta_type.down,
    name: '20261113_223222_whatsapp_meta_type',
  },
  {
    up: migration_20261116_144935_report_reading.up,
    down: migration_20261116_144935_report_reading.down,
    name: '20261116_144935_report_reading',
  },
  {
    up: migration_20261116_152621_batch_research_ai_usage.up,
    down: migration_20261116_152621_batch_research_ai_usage.down,
    name: '20261116_152621_batch_research_ai_usage',
  },
  {
    up: migration_20261116_180317_payment_terms.up,
    down: migration_20261116_180317_payment_terms.down,
    name: '20261116_180317_payment_terms',
  },
  {
    up: migration_20261117_150524_offer_benefits.up,
    down: migration_20261117_150524_offer_benefits.down,
    name: '20261117_150524_offer_benefits',
  },
  {
    up: migration_20261123_185841_instagram_auto_replies.up,
    down: migration_20261123_185841_instagram_auto_replies.down,
    name: '20261123_185841_instagram_auto_replies',
  },
  {
    up: migration_20261123_192406_instagram_unified_login.up,
    down: migration_20261123_192406_instagram_unified_login.down,
    name: '20261123_192406_instagram_unified_login',
  },
  {
    up: migration_20261126_122331_ia_para_humanos.up,
    down: migration_20261126_122331_ia_para_humanos.down,
    name: '20261126_122331_ia_para_humanos'
  },
];
