# Dialpad Tap — scripted concept demo

A customer-facing vision site for the Dialpad Tap hackathon proposal. The travel, healthcare, finance, and retail examples are illustrations. The “Tap to talk” button opens a scripted Clearway customer-app preview. The preview has three pre-recorded voices, captions, transfer review, simulated Face ID, and a same-conversation handoff to Sam. After the call, Maya can give spoken feedback or choose “Maybe later,” then return to the Clearway home screen. In this watch-only preview, speaker mute silences playback without stopping the captions or story, while microphone mute is a visual control. End leaves the conversation. It does not connect to a live Dialpad agent, microphone, customer account, payment, email, or document upload.

The static site is published from the repository's `tap/` directory. All site paths are relative. Spoken lines and fictional policy are in `demo-script.js`; pre-recorded clips are in `audio/`. The runtime works with captions if audio is unavailable. Audio generation tools are kept in the local working project rather than the published site.

This shareable copy excludes Season trial font files. It loads the Season Sans and Mix webfonts from Dialpad’s public website, which allows cross-origin font requests. It includes Dialtone color tokens under `DIALTONE_LICENSE.md`.
