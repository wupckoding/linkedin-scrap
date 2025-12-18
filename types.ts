
export type LeadStatus = 'new' | 'contacted' | 'negotiating' | 'closed' | 'rejected';

export interface Lead {
  id: string;
  name: string;
  headline: string;
  company: string;
  location: string;
  country: string;
  phoneNumber: string;
  whatsapp?: string;
  email: string;
  linkedinUrl: string;
  niche: string;
  status: LeadStatus;
  createdAt: number;
  qualityScore: number;
  confidence: 'high' | 'medium' | 'low';
  conversionProb: number; 
  integrity: number; 
  localizedPitch: string;
  emailSubject: string; // Novo campo para assunto do e-mail
}

export enum ExtractionStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  STOPPING = 'STOPPING',
  ERROR = 'ERROR'
}

export interface EngineConfig {
  mode: 'nano' | 'quantum' | 'neural';
  autoEnrich: boolean;
  frequency: number;
}
