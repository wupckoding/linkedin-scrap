
import { GoogleGenAI, Type } from "@google/genai";
import { Lead } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const discoverLeadsEngine = async (niche: string, country: string, mode: string): Promise<Partial<Lead>[]> => {
  try {
    const model = mode === 'neural' ? "gemini-3-pro-preview" : "gemini-3-flash-preview";
    
    const response = await ai.models.generateContent({
      model: model,
      contents: `VOCÊ É O SISTEMA DE VALIDAÇÃO JBNEXO (jbnexo.com).
      Sua tarefa é minerar 10 leads de ALTA QUALIDADE para: "${niche}" em "${country}".

      FILTRO DE WHATSAPP (CRÍTICO - TOLERÂNCIA ZERO):
      1. APENAS forneça leads com números de telefone REAIS e ATIVOS no WhatsApp.
      2. O campo 'phoneNumber' deve conter APENAS NÚMEROS (Ex: 5511988887777).
      3. PROIBIDO: Números sequenciais (123456...), números repetidos (99999...), ou números de exemplo/fictícios.
      4. Se você não tiver 100% de certeza que o número é um contato comercial real daquela empresa, NÃO retorne o lead. É melhor retornar menos leads do que leads inválidos.
      5. Formato: Código do País + DDD + Número.

      DIRETRIZES DE ABORDAGEM:
      - Objetivo: Vídeo chamada de 15 minutos via Google Meet/Zoom.
      - Autoridade: JBNEXO (jbnexo.com) - Especialistas em escala de faturamento B2B.
      - Call to Action: Link para agendamento direto: https://calendly.com/bruno-jbnexo/new-meeting.
      - Idioma: O script deve estar no idioma predominante de ${country}.

      DATA PROTOCOL (JSON):
      - name: Nome completo.
      - company: Empresa real.
      - headline: Cargo.
      - email: E-mail corporativo verificado.
      - phoneNumber: String numérica pura (Ex: 5511999998888).
      - emailSubject: Assunto do e-mail impactante.
      - localizedPitch: Texto de abordagem personalizado.
      - conversionProb: Score de 0-100.
      - integrity: Probabilidade de validade do WhatsApp (0-100).`,
      config: {
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
              conversionProb: { type: Type.NUMBER },
              integrity: { type: Type.NUMBER }
            },
            required: ["name", "company", "email", "phoneNumber", "localizedPitch", "emailSubject", "integrity"]
          }
        }
      }
    });
    
    // Filtragem adicional de segurança no lado do cliente
    const rawLeads = JSON.parse(response.text || '[]');
    return rawLeads.filter((l: any) => l.integrity > 85 && l.phoneNumber.length >= 10);
  } catch (error) {
    console.error("Erro no motor de mineração JBNEXO", error);
    return [];
  }
};
