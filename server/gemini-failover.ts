// Gemini API Failover System with Rate Limit Handling
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Model configurations based on rate limits
const TEXT_GENERATION_MODELS = [
  { model: 'gemini-2.5-flash', rpm: 1000, tpm: 4000000, rpd: 1500 },
  { model: 'gemini-2.5-flash-lite', rpm: 1000, tpm: 4000000, rpd: 1500 },
  { model: 'gemini-2.0-flash-exp', rpm: 10, tpm: 250000, rpd: 50 },
  { model: 'gemini-1.5-flash', rpm: 15, tpm: 1000000, rpd: 200 },
  { model: 'gemini-1.5-pro', rpm: 10, tpm: 250000, rpd: 50 },
];

const EMBEDDING_MODELS = [
  { model: 'text-embedding-004', rpm: 1500, tpm: 1000000 },
  { model: 'text-embedding-003', rpm: null, tpm: null }, // Backup
];

// Helper to detect rate limit errors
function isRateLimitError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorStatus = error?.status || error?.statusCode;
  
  return (
    errorStatus === 429 ||
    errorMessage.includes('quota') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('resource exhausted') ||
    errorMessage.includes('429')
  );
}

// Generate content with automatic model failover
export async function generateContentWithFailover(
  prompt: string,
  options?: {
    preferredModel?: string;
    maxRetries?: number;
  }
): Promise<{ text: string; modelUsed: string }> {
  const { preferredModel, maxRetries = TEXT_GENERATION_MODELS.length } = options || {};
  
  // Start with preferred model if specified, otherwise use order
  const modelsToTry = preferredModel
    ? [
        TEXT_GENERATION_MODELS.find(m => m.model === preferredModel),
        ...TEXT_GENERATION_MODELS.filter(m => m.model !== preferredModel)
      ].filter(Boolean) as typeof TEXT_GENERATION_MODELS
    : TEXT_GENERATION_MODELS;

  let lastError: any = null;
  
  for (let i = 0; i < Math.min(maxRetries, modelsToTry.length); i++) {
    const modelConfig = modelsToTry[i];
    
    try {
      console.log(`📡 Trying model: ${modelConfig.model} (attempt ${i + 1}/${maxRetries})`);
      
      const model = genAI.getGenerativeModel({ model: modelConfig.model });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      if (text && text.trim().length > 0) {
        console.log(`✅ Successfully generated content using: ${modelConfig.model}`);
        return { text, modelUsed: modelConfig.model };
      }
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Model ${modelConfig.model} failed:`, error.message);
      
      // If it's a rate limit error, try next model
      if (isRateLimitError(error)) {
        console.log(`⚠️  Rate limit hit for ${modelConfig.model}, trying next model...`);
        continue;
      }
      
      // If it's not a rate limit error, throw it
      throw error;
    }
  }
  
  // All models failed
  throw new Error(`All Gemini models failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// Generate embeddings with failover
export async function generateEmbeddingWithFailover(
  text: string,
  options?: {
    preferredModel?: string;
    maxRetries?: number;
  }
): Promise<{ embedding: number[]; modelUsed: string }> {
  const { preferredModel, maxRetries = EMBEDDING_MODELS.length } = options || {};
  
  const modelsToTry = preferredModel
    ? [
        EMBEDDING_MODELS.find(m => m.model === preferredModel),
        ...EMBEDDING_MODELS.filter(m => m.model !== preferredModel)
      ].filter(Boolean) as typeof EMBEDDING_MODELS
    : EMBEDDING_MODELS;

  let lastError: any = null;
  
  for (let i = 0; i < Math.min(maxRetries, modelsToTry.length); i++) {
    const modelConfig = modelsToTry[i];
    
    try {
      console.log(`🔢 Trying embedding model: ${modelConfig.model} (attempt ${i + 1}/${maxRetries})`);
      
      const model = genAI.getGenerativeModel({ model: modelConfig.model });
      const result = await model.embedContent(text);
      const embedding = result.embedding.values;
      
      if (embedding && embedding.length > 0) {
        console.log(`✅ Successfully generated embedding using: ${modelConfig.model}`);
        return { embedding: embedding as number[], modelUsed: modelConfig.model };
      }
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Embedding model ${modelConfig.model} failed:`, error.message);
      
      // If it's a rate limit error, try next model
      if (isRateLimitError(error)) {
        console.log(`⚠️  Rate limit hit for ${modelConfig.model}, trying next embedding model...`);
        continue;
      }
      
      // If it's not a rate limit error, throw it
      throw error;
    }
  }
  
  // All models failed
  throw new Error(`All embedding models failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

// Export model lists for reference
export { TEXT_GENERATION_MODELS, EMBEDDING_MODELS };
