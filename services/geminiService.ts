
import { GoogleGenAI, Type } from "@google/genai";
import { Task } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const categorizeTask = async (taskText: string): Promise<{ category: string; priority: string }> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Categorize this task and assign a priority (low, medium, high). Task: "${taskText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: "A one-word category (e.g., Work, Personal, Health, Finance, Shopping)" },
            priority: { type: Type.STRING, description: "Priority level: low, medium, or high" }
          },
          required: ["category", "priority"]
        }
      }
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("AI Categorization failed:", error);
    return { category: "General", priority: "medium" };
  }
};

export const getSmartSuggestions = async (existingTasks: Task[]): Promise<{ suggestions: { task: string; reason: string }[] }> => {
  const ai = getAI();
  const taskList = existingTasks.map(t => t.text).join(", ");
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on these existing tasks: [${taskList}], suggest 3 new productive tasks the user might want to do next.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  task: { type: Type.STRING },
                  reason: { type: Type.STRING, description: "Why this is a good next step" }
                },
                required: ["task", "reason"]
              }
            }
          },
          required: ["suggestions"]
        }
      }
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("AI Suggestions failed:", error);
    return { suggestions: [] };
  }
};
