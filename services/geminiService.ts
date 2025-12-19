
import { GoogleGenAI, Type } from "@google/genai";
import { Lead, GroundingSource } from "../types";

export interface DiscoveryResult {
  leads: Partial<Lead>[];
  sources: GroundingSource[];
}

export const discoverLeadsEngine = async (niche: string, country: string): Promise<DiscoveryResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    // Usando Gemini 3 Pro para máxima precisão na verificação de "pessoas reais"
    const model = "gemini-3-pro-preview";
    
    const response = await ai.models.generateContent({
      model: model,
      contents: `VOCÊ É UM AUDITOR DE DADOS DE ELITE. Sua missão é extrair EXATAMENTE 5 leads de PESSOAS REAIS (CEOs, Founders, Diretores) no nicho "${niche}" em "${country}".

      FILTRO DE VERACIDADE RIGOROSO:
      1. PROIBIDO FAKES: Descarte qualquer lead com telefones genéricos (ex: 123456, 999999), números de recepção fixa (PBX) ou nomes fictícios.
      2. PEGADA DIGITAL: O lead deve ter uma presença verificável (LinkedIn, Site Institucional, Registro Profissional).
      3. TELEFONE PESSOAL/WHATSAPP: Priorize números que sigam o padrão de celular de ${country}. Extraia APENAS OS DÍGITOS.
      4. IDIOMA: Escreva o "localizedPitch" e "emailSubject" no idioma nativo de ${country}. Use técnicas de copywriting persuasivo para agendar call no Calendly: https://calendly.com/bruno-jbnexo/new-meeting.

      DATA SCHEMA (JSON ARRAY):
      - name: Nome Completo (Verificado)
      - company: Nome da Empresa Real
      - email: E-mail profissional/pessoal direto
      - phoneNumber: DDI + DDD + Número (Apenas dígitos)
      - emailSubject: Assunto impossível de ignorar (Idioma local)
      - localizedPitch: Texto de WhatsApp focado em agendamento (Idioma local)
      - integrity: Score de 0-100 (Só retorne se for > 95)
      - proof_url: Link da fonte (LinkedIn, Bio, Site)`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              company: { type: Type.STRING },
              email: { type: Type.STRING },
              phoneNumber: { type: Type.STRING },
              emailSubject: { type: Type.STRING },
              localizedPitch: { type: Type.STRING },
              integrity: { type: Type.NUMBER },
              proof_url: { type: Type.STRING }
            },
            required: ["name", "company", "phoneNumber", "integrity", "localizedPitch", "emailSubject", "proof_url"]
          }
        }
      }
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = chunks
      .filter(chunk => chunk.web)
      .map(chunk => ({
        title: chunk.web!.title || 'Fonte Auditada',
        url: chunk.web!.uri
      }));
    
    if (!response.text) return { leads: [], sources };

    const rawLeads: any[] = JSON.parse(response.text.trim());
    
    // Filtragem de segurança adicional no código
    const filteredLeads = Array.isArray(rawLeads) 
      ? rawLeads.filter((l: any) => 
          l.phoneNumber && 
          l.phoneNumber.length >= 8 && 
          !/^(.)\1+$/.test(l.phoneNumber) && // Evita 99999999
          l.name.split(' ').length > 1 // Exige nome e sobrenome
        )
      : [];

    return { leads: filteredLeads, sources };
  } catch (error: any) {
    console.error("Erro no Motor Titanium:", error);
    throw error;
  }
};
