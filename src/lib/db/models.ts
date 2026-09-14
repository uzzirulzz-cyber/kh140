
import mongoose, { Schema } from 'mongoose';

const BusinessSchema = new Schema({
  businessName: { type: String, required: true, index: true },
  legalName: String,
  description: String,
  industry: { type: String, index: true },
  category: { type: String, index: true },
  subcategory: String,
  country: { type: String, required: true, index: true },
  state: String,
  city: { type: String, required: true, index: true },
  area: String,
  postalCode: String,
  address: String,
  latitude: Number,
  longitude: Number,
  website: String,
  domain: { type: String, index: true },
  phone: { type: String, index: true },
  phoneIntl: String,
  email: { type: String, index: true },
  emailStatus: { type: String, default: 'UNVERIFIED', enum: ['VALID','INVALID','QUESTIONABLE','UNVERIFIED'] },
  emailConfidence: { type: Number, default: 0 },
  whatsapp: { type: String, index: true },
  whatsappStatus: { type: String, default: 'PHONE_ONLY', enum: ['CONFIRMED_PUBLIC_WHATSAPP','POSSIBLE_WHATSAPP','PHONE_ONLY'] },
  whatsappConfidence: { type: Number, default: 0 },
  socialLinks: Schema.Types.Mixed,
  sources: Schema.Types.Mixed,
  primarySource: String,
  sourceUrls: [String],
  leadScore: { type: Number, default: 0, index: true },
  status: { type: String, default: 'ACTIVE' },
  campaignId: { type: String, index: true },
  evidence: Schema.Types.Mixed, // { emailEvidence, whatsappEvidence, sourceUrl }
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
BusinessSchema.index({ email: 1, domain: 1, phone: 1, whatsapp: 1, businessName: 1, city: 1, country: 1, category: 1, campaignId: 1 });
BusinessSchema.index({ domain: 1 }, { unique: false, sparse: true }); // Prevent duplicates via application logic - aggressive dedup

const CampaignSchema = new Schema({
  name: String,
  filters: Schema.Types.Mixed,
  target: { type: Number, default: 1000, min: 1000 }, // MIN 1000 enforced
  status: { type: String, default: 'DRAFT', enum: ['DRAFT','QUEUED','RUNNING','PAUSED','COMPLETED','CANCELLED','FAILED'] },
  progress: { type: Number, default: 0 },
  stats: { type: Schema.Types.Mixed, default: { discovered:0, unique:0, emails:0, whatsapp:0, phones:0, websites:0, duplicates:0, invalid:0, highQuality:0 } },
  sourcesUsed: [String],
  startedAt: Date,
  completedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const SourceSchema = new Schema({
  key: { type: String, unique: true },
  name: String,
  category: String,
  purpose: [String],
  status: { type: String, default: 'ACTIVE' },
  priority: Number,
  quota: Number,
  requests: { type: Number, default: 0 },
  errorRate: { type: Number, default: 0 },
  lastSuccess: Date,
  lastError: String,
  config: Schema.Types.Mixed,
  enabled: { type: Boolean, default: true },
  coverage: String,
  free: Boolean,
  url: String,
  createdAt: { type: Date, default: Date.now }
});

const SuppressionSchema = new Schema({
  type: { type: String, enum: ['email','domain','phone','whatsapp','business'] },
  value: { type: String, unique: true },
  reason: String,
  createdAt: { type: Date, default: Date.now }
});

const AuditLogSchema = new Schema({
  action: String,
  entity: String,
  entityId: String,
  meta: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

export const Business = mongoose.models.Business || mongoose.model('Business', BusinessSchema);
export const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
export const Source = mongoose.models.Source || mongoose.model('Source', SourceSchema);
export const Suppression = mongoose.models.Suppression || mongoose.model('Suppression', SuppressionSchema);
export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', AuditLogSchema);
