// Fictional Clearway scenario. Every line and policy is scripted for the concept demo.
export const demoScript = [
  { type: 'line', id: '01', speaker: 'ai', text: 'Hi Maya. What can I help with?' },
  { type: 'line', id: '02', speaker: 'maya', text: 'I sent five hundred dollars to my sister in India. When will she get it?' },
  { type: 'check', text: 'Checking your transfer', wait: 1200 },
  { type: 'card', style: 'status', label: 'Transfer', title: '$500 to Anika · Pending', detail: 'Expected in about 40 minutes' },
  { type: 'line', id: '03', speaker: 'ai', text: "Let me see... Okay, it's still pending. She should have it in about forty minutes." },
  { type: 'line', id: '04', speaker: 'maya', text: "Oh. The rate's gone up since I sent it, hasn't it?" },
  { type: 'line', id: '05', speaker: 'ai', text: 'Has it? Let me check the current rate.' },
  { type: 'check', text: 'Comparing exchange rates', wait: 1100 },
  { type: 'card', style: 'compare', label: 'Exchange rate', title: '₹88.00 → ₹90.23', detail: 'The rate is higher now' },
  { type: 'line', id: '06', speaker: 'ai', text: "You're right. Your transfer used eighty-eight rupees to the dollar. It's ninety point two three now." },
  { type: 'line', id: '07', speaker: 'maya', text: 'Right. Could I cancel it and send it again at the new rate?' },
  { type: 'line', id: '08', speaker: 'ai', text: "Usually, once a transfer is placed, we can't cancel it. But yours is still pending, and it's your first one. I can make a one-time exception. Would you like to review the new transfer?", beats: ["Usually, once a transfer is placed, we can't cancel it. But yours is still pending, and it's your first one.", "I can make a one-time exception. Would you like to review the new transfer?"] },
  { type: 'line', id: '09', speaker: 'maya', text: 'Yes, please. That would help.' },
  { type: 'card', style: 'transfer-review', label: 'Review before confirming', title: 'Cancel and resend', rows: [['To', 'Anika Rao'], ['You send', '$500'], ['New rate', '₹90.23 / $1'], ['Anika gets', '₹45,115']], detail: 'Nothing changes until you confirm.' },
  { type: 'line', id: '10', speaker: 'ai', text: "Here's the new transfer. Five hundred dollars to Anika, at ninety point two three. She'll get forty-five thousand one hundred fifteen rupees. If it looks right, confirm with Face ID.", beats: ["Here's the new transfer. Five hundred dollars to Anika, at ninety point two three.", "She'll get forty-five thousand one hundred fifteen rupees. If it looks right, confirm with Face ID."] },
  { type: 'line', id: '11', speaker: 'maya', text: 'Yes. That looks right.' },
  { type: 'card', style: 'face-id', label: 'Face ID', title: 'Confirming transfer', detail: 'Secure confirmation in the app' },
  { type: 'card', style: 'approved', label: 'Transfer updated', title: 'New transfer on its way', detail: 'Old pending transfer cancelled' },
  { type: 'line', id: '12', speaker: 'ai', text: "Okay, that's done. The old transfer is cancelled, and the new one is on its way." },
  { type: 'line', id: '13', speaker: 'maya', text: "Thank you. Oh, one more thing. Next week I need to send eight thousand dollars for my sister's wedding. My limit is only three thousand." },
  { type: 'check', text: 'Checking your account limit', wait: 900 },
  { type: 'card', style: 'review', label: 'Transfer limit', title: '$3,000 now · $8,000 requested', detail: 'A higher limit needs document review' },
  { type: 'line', id: '14', speaker: 'ai', text: "For that amount, we'll need a limit review and a couple of documents. I'll get one of our representatives in here. Just give me a moment." },
  { type: 'handoff', name: 'Sam joined' },
  { type: 'line', id: '15', speaker: 'sam', text: "Hi Maya, I'm Sam. I can see the transfer you just updated, and your request to send eight thousand next week. To raise the limit, we'll need a photo ID and proof of funds.", beats: ["Hi Maya, I'm Sam. I can see the transfer you just updated, and your request to send eight thousand next week.", "To raise the limit, we'll need a photo ID and proof of funds."] },
  { type: 'line', id: '16', speaker: 'maya', text: "I don't have those with me right now. Can I send them later?" },
  { type: 'line', id: '17', speaker: 'sam', text: "Of course. I've sent a secure upload link to your registered email. It opens back in this app. Send the documents when you're ready, and we'll review them within three business days.", beats: ["Of course. I've sent a secure upload link to your registered email. It opens back in this app.", "Send the documents when you're ready, and we'll review them within three business days."] },
  { type: 'card', style: 'next-step', label: 'Next step', title: 'Secure upload link sent', detail: 'Send documents later · Review within three business days' },
  { type: 'line', id: '18', speaker: 'maya', text: 'Great. I can do that tonight. Thanks, Sam.' },
  { type: 'line', id: '19', speaker: 'sam', text: "You're welcome, Maya. And congratulations to your sister." },
];

export const speakerLabels = { ai: 'Clearway assistant', maya: 'Maya', sam: 'Sam · Clearway' };

// Optional, scripted follow-up in the same conversation after the ending screen.
export const feedbackScript = [
  { type: 'line', id: 'f01', speaker: 'ai', text: 'Hey Maya. Before you go, could you help us with something? How did that feel?', beats: ['Hey Maya. Before you go, could you help us with something?', 'How did that feel?'] },
  { type: 'line', id: 'f02', speaker: 'maya', text: "Honestly, good. I thought I'd have to explain everything again when Sam joined, but he already knew." },
  { type: 'line', id: 'f03', speaker: 'ai', text: "I'm glad. Was anything confusing?" },
  { type: 'line', id: 'f04', speaker: 'maya', text: "Just one thing. After Face ID, I wasn't sure the old transfer had been cancelled." },
  { type: 'line', id: 'f05', speaker: 'ai', text: "That's helpful. We should have shown that more clearly. I'll share it with the Clearway team. Thank you, Maya.", beats: ["That's helpful. We should have shown that more clearly.", "I'll share it with the Clearway team. Thank you, Maya."] },
  { type: 'line', id: 'f06', speaker: 'maya', text: 'Yeah, of course.' },
  { type: 'card', style: 'feedback-receipt', label: 'Feedback', title: 'Shared with Clearway', detail: 'Your note about the transfer confirmation was saved.' },
];
