
import { GoogleGenAI } from "@google/genai";

export const geminiService = {
  generateDescription: async (productName: string, category: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Você é um redator de moda de luxo. Escreva uma descrição curta, sedutora e moderna para uma peça de vestuário chamada "${productName}" na categoria "${category}". Foque em estilo, conforto e exclusividade. Use no máximo 180 caracteres.`,
      });
      return response.text || "Descrição não gerada.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Ocorreu um erro ao gerar a descrição inteligente.";
    }
  }
};
