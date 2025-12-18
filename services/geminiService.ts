
import { GoogleGenAI, Type } from "@google/genai";
import { Lead } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const discoverLeadsEngine = async (niche: string, country: string, mode: string): Promise<Partial<Lead>[]> => {
  try {
    const model = "gemini-3-pro-preview";
    
    const response = await ai.models.generateContent({
      model: model,
      contents: `VOCÊ É O AGENTE DE BUSCA EM TEMPO REAL JBNEXO (jbnexo.com).
      Sua missão é localizar 10 leads REAIS para o nicho "${niche}" em "${country}".

      PROTOCOLO DE VERACIDADE E IDIOMA (CRÍTICO):
      1. Use a ferramenta GOOGLE SEARCH para validar se a pessoa realmente trabalha na empresa e se o telefone existe.
      2. IDIOMA: Detecte o idioma predominante de "${country}" e gere o 'localizedPitch' e 'emailSubject' NESSE IDIOMA. Ex: Se for Brasil, use Português. Se for EUA, use Inglês.
      3. O número de telefone deve ser extraído de fontes reais (sites, diretórios).
      4. O campo 'localizedPitch' deve ser um script de vendas matador para marcar uma call de 15 min no link: https://calendly.com/bruno-jbnexo/new-meeting.

      DATA FORMAT (JSON):
      - name: Nome Real.
      - company: Empresa Real.
      - email: E-mail profissional.
      - phoneNumber: APENAS NÚMEROS (Ex: 5511...).
      - emailSubject: Assunto impactante no idioma local.
      - localizedPitch: Script de abordagem no idioma local.
      - integrity: Score de 0-100 de certeza da busca real.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              headline: { type: Type.STRING },
              company: { type: Type.STRING },
              email: { type: Type.STRING },
              phoneNumber: { type: Type.STRING },
              emailSubject: { type: Type.STRING },
              localizedPitch: { type: Type.STRING },
              integrity: { type: Type.NUMBER }
            },
            required: ["name", "company", "phoneNumber", "integrity", "localizedPitch", "emailSubject"]
          }
        }
      }
    });
    
    const rawLeads = JSON.parse(response.text || '[]');
    return rawLeads.filter((l: any) => l.integrity >= 75 && l.phoneNumber && l.phoneNumber.length >= 10);
  } catch (error) {
    console.error("Falha na mineração multilíngue JBNEXO", error);
    return [];
  }
};
