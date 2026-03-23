export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return new Response(JSON.stringify({ error: 'Expected application/json' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    const body = await request.json().catch(() => null);
    const imageBase64 = body?.imageBase64 || body?.image_base64 || body?.image;
    const mimeType = body?.mimeType || body?.mime_type;

    if (!env?.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing GEMINI_API_KEY secret on the server.' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }

    if (!imageBase64 || !mimeType) {
      return new Response(JSON.stringify({ error: 'Missing imageBase64 or mimeType.' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    const MODEL_CANDIDATES = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-flash-latest'
    ];

    let lastError = null;
    for (const model of MODEL_CANDIDATES) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "You are an expert AI prompt engineer for Midjourney and DALL-E. Analyze this image and describe it in extreme detail to create a perfect text-to-image prompt. Include details about the subject, pose, colors, lighting, style, camera angle, and mood. Format the final output as a comma-separated list of keywords and descriptive phrases, ready to be pasted into an image generator. Do not include introductory text, just the prompt itself."
                },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: imageBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 800
          }
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = data?.error?.message || 'Gemini request failed';
        const isModelNotFound = response.status === 404;
        const looksUnsupported = /not\s*found|unrecognized|not\s*supported|unsupported|invalid\s*model/i.test(message);

        if (isModelNotFound || looksUnsupported) {
          lastError = new Error(message || `Model not usable: ${model}`);
          continue;
        }

        return withCors(new Response(JSON.stringify({ error: message }), {
          status: response.status || 500,
          headers: { 'content-type': 'application/json' }
        }));
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text === 'string' && text.trim().length > 0) {
        return withCors(
          new Response(JSON.stringify({ prompt: text.trim(), model }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        );
      }

      return withCors(
        new Response(JSON.stringify({ error: 'Unexpected Gemini response structure.' }), {
          status: 500,
          headers: { 'content-type': 'application/json' }
        })
      );
    }

    return withCors(
      new Response(JSON.stringify({ error: lastError?.message || 'Failed to generate prompt with available models.' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      })
    );
  } catch (err) {
    return withCors(
      new Response(JSON.stringify({ error: err?.message || 'Server error' }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      })
    );
  }
}

function withCors(response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', '*');
  return response;
}

// Optional: respond to OPTIONS preflight (needed if you later call this from another origin).
export const onRequestOptions = async (context) => {
  return withCors(new Response(null, { status: 204 }));
};

