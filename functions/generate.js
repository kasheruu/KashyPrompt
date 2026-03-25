import { handleGeneratePost, handleGenerateOptions } from './gemini-handler.js';

export async function onRequestPost(context) {
  return handleGeneratePost(context.request, context.env);
}

export const onRequestOptions = async () => handleGenerateOptions();
