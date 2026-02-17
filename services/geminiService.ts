
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateMarketingCopy(prompt: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a world-class marketing copywriter. Generate high-converting copy based on the following request: ${prompt}`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini copy generation failed:", error);
    return "Failed to generate AI copy. Please try again.";
  }
}

export async function generateSmartReply(context: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a friendly customer success assistant. Based on this conversation history, suggest a professional, concise, and helpful reply to book an appointment or answer the lead's question. Conversation context: ${context}`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini smart reply failed:", error);
    return null;
  }
}

export async function analyzeLeadHistory(name: string, activities: any[]) {
  try {
    const historyStr = activities.map(a => `[${a.timestamp}] ${a.type}: ${a.content}`).join('\n');
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analyze the following CRM activity history for lead "${name}". 
      1. Provide a concise 2-sentence executive summary of the relationship.
      2. Suggest the "Next Tactical Move" to close the deal.
      3. Rate the "Closing Probability" (0-100%).
      
      History:
      ${historyStr}`,
    });
    return response.text;
  } catch (error) {
    console.error("Lead analysis failed:", error);
    return "Insufficient data for neural profiling.";
  }
}

export async function suggestAutomationSteps(businessType: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Suggest a 5-step marketing automation workflow for a ${businessType}. Include triggers and wait times. Return in JSON format.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              stepName: { type: Type.STRING },
              action: { type: Type.STRING },
              description: { type: Type.STRING },
              wait: { type: Type.STRING }
            }
          }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini automation suggestion failed:", error);
    return [];
  }
}
