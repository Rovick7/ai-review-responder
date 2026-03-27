export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, type, voice, rating, review } = req.body;

  // Basic validation
  if (!name || !type || !voice || !rating || !review) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const sentimentBlock = rating <= 3
    ? `This is a negative review (${rating}/5 stars). Include a sincere apology, acknowledge the specific issue, express genuine willingness to make it right, and remain calm — never defensive.`
    : `This is a positive review (${rating}/5 stars). Express warm appreciation, reinforce the positive experience they mentioned, and invite them to return.`;

  const prompt = `
Business Name: ${name}
Business Type: ${type}
Brand Voice: ${voice}
Review Rating: ${rating} out of 5 stars
Customer Review: "${review}"

Tone & Sentiment Rules:
${sentimentBlock}

Instructions:
Write 3 distinct response variations to this customer review. Each must:
- Sound genuinely human, not robotic or templated
- Thank the customer
- Reference specific details from their review
- Match the "${voice}" brand voice throughout
- ${rating >= 4 ? 'Invite the customer to return' : 'Offer a path to resolution'}

Return ONLY this exact format with no extra text, preamble, or markdown:

OPTION_SHORT:
[1-2 sentence response here]

OPTION_BALANCED:
[3-4 sentence response here]

OPTION_DETAILED:
[5-7 sentence response here, most personal and thorough]
`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are a professional customer service expert who writes personalized, authentic responses to customer reviews. You match the exact brand voice requested and always sound human — never generic or robotic. Return responses in the exact format specified. No markdown, no labels beyond what is specified.',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await anthropicRes.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const raw = data.content.map(b => b.text || '').join('');
    return res.status(200).json({ raw });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
