import Groq from 'groq-sdk';

let groqInstance: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqInstance) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }
    groqInstance = new Groq({ apiKey });
  }
  return groqInstance;
}

// Lazy getter for backward compatibility
const groqHandler = {
  get(target: any, prop: string) {
    const client = getGroqClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
};

const groq = new Proxy({} as Groq, groqHandler);

export default groq;

export const AI_MODEL = 'llama-3.3-70b-versatile';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;
const requestTimestamps: number[] = [];

export function checkRateLimit(): boolean {
  const now = Date.now();
  // Remove timestamps outside the current window
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW) {
    requestTimestamps.shift();
  }
  
  if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  requestTimestamps.push(now);
  return true;
}
