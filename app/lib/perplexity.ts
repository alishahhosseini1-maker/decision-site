export type EvidenceBlock = {
  content: string;
  compressed: string;
};

export async function fetchPerplexityEvidence(
  decision: string,
  context: string
): Promise<EvidenceBlock | null> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    console.warn('[perplexity] PERPLEXITY_API_KEY not set, skipping');
    return null;
  }

  try {
    const query = `Real-world signals for decision: "${decision}". Context: ${context}.
Return 3-5 sentences covering: (1) recent comparable outcomes or failures in the last 90 days, (2) current market risks or headwinds, (3) credible data points (costs, timelines, failure rates) relevant to this decision type. Include source URLs.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'user',
            content: query,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('[perplexity] API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    const fullContent = data.choices?.[0]?.message?.content;

    if (!fullContent) {
      console.warn('[perplexity] No content in response');
      return null;
    }

    // Extract first 2 sentences for compressed version
    const sentences = fullContent.match(/[^.!?]+[.!?]+/g) || [];
    const compressed = sentences.slice(0, 2).join(' ').trim();

    return {
      content: fullContent,
      compressed: compressed || fullContent.substring(0, 200),
    };
  } catch (err) {
    console.error('[perplexity] Error fetching evidence:', err);
    return null;
  }
}
