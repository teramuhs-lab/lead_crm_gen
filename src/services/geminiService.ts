// TODO: Move all AI functions server-side in Phase 1B.
// API keys must never be exposed in the browser bundle.
import { GoogleGenAI, Type } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function generateMarketingCopy(prompt: string) {
  if (!ai) return "AI is not configured. Add VITE_GEMINI_API_KEY to .env.local";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are a world-class marketing copywriter. Generate high-converting copy based on the following request: ${prompt}`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini copy generation failed:", error);
    return "Failed to generate AI copy. Please try again.";
  }
}

export async function generateSmartReply(context: string) {
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are a friendly customer success assistant. Based on this conversation history, suggest a professional, concise, and helpful reply to book an appointment or answer the lead's question. Conversation context: ${context}`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini smart reply failed:", error);
    return null;
  }
}

export async function analyzeLeadHistory(name: string, activities: any[]) {
  if (!ai) return "AI is not configured. Add VITE_GEMINI_API_KEY to .env.local";
  try {
    const historyStr = activities.map(a => `[${a.timestamp}] ${a.type}: ${a.content}`).join('\n');
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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
    return "Lead analysis unavailable.";
  }
}

export async function suggestAutomationSteps(businessType: string) {
  if (!ai) return [];
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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
