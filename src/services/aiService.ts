import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export const debugAvailableModels = async () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    console.log("🔍 Checking available models for your API Key...");

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.error) {
            console.error("API Error:", data.error);
            return;
        }

        // Filter for models that specifically support "generateContent" (what we need)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const usableModels = data.models?.filter((m: any) =>
            m.supportedGenerationMethods?.includes("generateContent")
        );

        console.log("✅ RAW MODEL LIST:", data.models);
        console.table(usableModels?.map((m: any) => ({
            name: m.name,
            displayName: m.displayName
        })));

        console.log("💡 TRY USING ONE OF THE NAMES FROM THE TABLE ABOVE IN YOUR CODE.");
    } catch (error) {
        console.error("Network Error checking models:", error);
    }
};

export const analyzeReceipt = async (
    imageFile: File,
    categories: string[],
    paymentMethods: string[]
) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
        const base64Data = await fileToGenerativePart(imageFile);

        // Dynamic prompt with user's settings
        const prompt = `
      Analyze this receipt image. Extract data and return a pure JSON object (no markdown).
      
      Rules for extraction:
      1. amount: The total amount (number).
      2. date: The date in "YYYY-MM-DD" format. If not found, use today's date.
      3. description: A short merchant name with brief description.
      4. category: Choose the best fit from this exact list: ${JSON.stringify(categories)}. If unsure, pick the closest fit or 'Misc'.
      5. paymentMethod: Choose the best fit from this exact list: ${JSON.stringify(paymentMethods)}. Try to find the payment method in the receipt and also check substrings for that payment method, if multiple exists with the substrings, pick the first option. For example, if the receipt says *1000 Mastercard and there's a payment method called Zolve Mastercard, that would be the payment method. Similarly, if the receipt says American Express, and ther's a payment method called Amex, then Amex is the pick. If unsure, pick 'Other'.

      Output Format:
      {
        "amount": 0.00,
        "date": "YYYY-MM-DD",
        "description": "String",
        "category": "String",
        "paymentMethod": "String"
      }
    `;

        const result = await model.generateContent([prompt, base64Data]);
        const response = await result.response;
        const text = response.text();
        const cleanJson = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("AI Analysis Failed:", error);
        throw error;
    }
};

async function fileToGenerativePart(file: File) {
    return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1];
            resolve({ inlineData: { data: base64Data, mimeType: file.type } });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}