# Dialpad Tap — team execution plan

**Version:** 25 October 2026  
**Purpose:** A shareable brief for hackathon collaborators to critique, scope, and build from.  
**Status:** The Tap vision site and a scripted, prerecorded Clearway customer-app demo are published for recruiting and review. The working Dialpad agent, embedded live voice, live human takeover, shared voice/text session, Studio adaptive-UX authoring, and customer installation flow are **not built or verified**. The hackathon proof will use Dialpad's own web experience and iOS/Android apps and extend Studio to author the adaptive visual layer.

## The idea in one minute

**The app is the new phone.** When someone needs help, they open the business's app or website and talk right there. They do not need to find a support number, place a call, or leave what they were doing. Tap's Dialpad AI agent is already in that experience: it listens or reads, answers questions, guides the customer, and completes permitted tasks. If the customer needs a person, a human agent joins that same voice conversation or text thread with the story so far. The business installs and configures Tap through Dialpad.

**Non-negotiable release experience:** Voice, typing, and live human takeover must feel like **one conversation inside the business's own site or app**, and setup must be straightforward for a business on web, iOS, and Android. A new phone call, callback, ticket, or disconnected chat is a fallback, **not** evidence that Tap meets this bar.

**The change we want customers to feel:** “I don't call support. I talk to the app.” The help they would have called for is already there, anytime they need it. AI handles what it can; a person joins when needed, without making them start over.

**Business proposition:** Turn a business's own app and website into the place customers get service. Tap uses Dialpad's existing voice infrastructure, human routing, agent workspace, and AI to make the familiar support call an in-app conversation. The customer can get help there and a person can join without making them dial or repeat the issue. The hackathon demonstrates this first inside Dialpad's own web, iOS, and Android experiences; the future offering makes it easy for other businesses to install.

## What exists now

| Piece | Verified state |
| --- | --- |
| Brand and north-star website | **Live** at [amitdialpad.github.io/tap/](https://amitdialpad.github.io/tap/). It tells the complete product story and shows travel, healthcare, finance, and retail illustrations. |
| Website's “Tap to talk” button | Opens a scripted Clearway app preview on the same page. The visitor then taps “Need help? Tap to talk” inside the sample app to start autoplay. This is a presentation prototype, not a live support session. |
| Clearway demo | Published with 25 prerecorded spoken lines across the main story and feedback exchange, three distinct character voices, captions, adaptive status/review cards, a simulated Face ID step, and Sam joining the same displayed conversation. The visitor watches Maya's actions. After the call, “Tell us” plays a short scripted feedback conversation; “Maybe later” skips it. “Back to home” returns to the Clearway app screen. The story uses fictional transfer data and policies. |
| Dialpad Agentic AI, Webchat, workflows, native bindings | Official documentation describes agent skills, connectors, workflows, and digital and voice channels. A read-only audit of the locally available `origin/master` snapshot found configuration and routing integration points. Their exact combination for Tap still needs a hands-on test in a provisioned Dialpad tenant. |
| Tap AI agent, synthetic-data service, human queue, web/mobile client | Not yet configured or built for this project. |
| Dialpad web and mobile integration | Not yet built for Tap. The hackathon will prove Tap in Dialpad's own web experience and iOS/Android apps using a test account and controlled data. |
| Pricing, demand, product packaging | Hypotheses to test; no validated forecast. |

The website and Clearway sequence are the **north-star presentation**, not the working product. The voices and controls are scripted; the demo does not connect to a live microphone, Dialpad agent, human support queue, customer account, payment, email, or document upload. The four carousel industries are illustrative, not four integrations.

### Current scripted Clearway story

Maya asks about a pending $500 transfer to her sister in India. The assistant checks its status and a newer exchange rate, explains a fictional one-time cancellation exception, shows a cancel-and-resend review card, and simulates Maya's Face ID confirmation before showing the updated transfer. Maya then asks to raise her $3,000 limit so she can send $8,000 next week. The assistant brings Sam into the same displayed voice conversation; Sam asks for ID and proof of funds and says a secure upload link has been sent. That limit request remains **pending document review**. After the call, the customer can skip feedback or watch Maya give a short spoken response, then return to the Clearway home screen. This story is useful for pitching the experience; it is not the Dialpad-owned engineering proof below.

The marketing prototype is a **watch-only story**. The visitor starts it, then watches Maya review and approve the fictional transfer. The confirmation card and simulated Face ID represent Maya's action; no visitor approval is requested. The feedback invitation is optional for Maya, and the final action returns her to the Clearway home screen. These presentation choices do not establish live product capability. Any future prototype revision should be reviewed on its own terms rather than used as an engineering gate.

## Customer and buyer

- **End customer:** Someone who needs help while using a company's app or website.
- **Buyer:** A support, digital product, or customer-experience leader responsible for resolution quality and service cost. Validate the primary buyer in interviews.
- **Job to do:** Resolve a real issue without leaving the current experience or repeating the problem across AI and people.
- **Business value hypothesis:** Faster resolution, more completed tasks, fewer repeated explanations and abandoned conversations, lower cost per resolved issue, and a better digital experience. Measure these; do not invent ROI.

## Product requirements

### Customer side

1. A business can place a branded Tap entry point in its website and native iOS/Android apps.
2. The customer can begin by speaking or typing. AI is identified as AI; a person is identified as a person.
3. The AI uses approved knowledge and authorized customer context, can ask clarifying questions, and only performs explicitly permitted actions.
4. Useful facts and confirmed action results can appear on screen while the conversation continues.
5. The agent can choose when an approved visual helps the conversation and populate it from authorized, structured results. It cannot invent account facts or a successful action. The customer app renders the visual in its own design.
6. The customer can ask for a person at any time. The AI also escalates when it lacks facts, an action fails, or human judgment is needed.
7. A person joins the **same live voice conversation** when it began in voice, or the same text thread when it began in text. The customer stays inside the host site or app. The receiving person sees the issue, relevant authorized context, AI findings, attempted actions, and the unresolved question.
8. Moving between voice and typing preserves the conversation state. The customer can tell whether AI, queue, or person currently owns the conversation.
9. If a person is unavailable, Tap clearly offers a supported alternative. That alternative does not count as successful live takeover.
10. Mic denial, dropped connection, expired sign-in, and interrupted handoff have understandable recovery paths.

### Business side

1. The business can install Tap with a documented web embed and iOS/Android SDKs or supported native bindings, then test it before release. The precise packaging is an engineering decision after the current Dialpad clients are inspected.
2. An admin can connect approved knowledge and allowed actions, set identity rules, configure human routing and hours, and customize the customer-facing appearance.
3. In Dialpad Agentic Studio, an author can define when the agent may show a visual, choose or compose from approved components, bind fields to connector results, set confirmation and fallback rules, and preview the result in a test conversation. The author supplies the visual vocabulary and rules rather than hardcoding every finished card.
4. The business can see what the AI resolved, what required a person, where customers got stuck, and what each resolution cost.
5. The setup is repeatable across businesses. A custom one-off integration for every customer would weaken the business case.

## Proposed architecture and ownership

| Layer | Responsibility | First implementation choice |
| --- | --- | --- |
| Host website / app | Tap entry point, mic and text controls, conversation display, results, handoff state | Prove first inside Dialpad's web experience and iOS/Android apps. Later, package the same capability for other businesses. |
| Tap session layer | Preserve one conversation identity, ordered events, current owner, mode, and resumable context | Determine whether existing Dialpad session infrastructure already provides this. Add only the missing bridge. |
| Dialpad Agentic AI | Knowledge, skills, approved actions, no-guess rules, escalation | Configure in a test company first. |
| Agentic Studio adaptive-UX authoring | Let an author define visual intent, approved components, connector-field bindings, confirmation rules, and preview/test cases alongside the agent's skills | Extend the actual Studio owner surface as a hackathon deliverable. Inspect its separate source and tenant first; do not substitute a configuration file or one-off app card for authoring. |
| Data/action connector | Retrieve authorized data and execute allowed actions | Use a controlled Dialpad test account and synthetic support data for the hackathon. Later, connect each business's authorized systems. |
| Digital Contact Center and voice routing | Human availability, queue, takeover, agent desktop, context delivery | Configure existing Dialpad routing and inspect the exact voice path. |
| Admin surface | Install instructions, channel setup, knowledge/actions, handoff rules, analytics | Reuse existing Dialpad surfaces where appropriate. Adaptive visual authoring belongs in Studio with the agent, not in a separate Tap-only configuration screen. |
| Tap marketing site | Explain the offering and show the north star | Published with a scripted Clearway preview. Keep the preview clearly labeled and separate from claims of live product capability. |

**Critical unknown:** Public docs show AI agents on digital and voice channels, native mobile bindings, and escalation. They do **not establish** that AI voice started inside a customer's web/app UI can continue live to a human there, nor that voice and text automatically share one session. The first engineering spike must trace the real clients and routing, not infer support from adjacent features.

### Where the real conversation would be built

Tap is **not** one fixed script authored in a single Studio canvas. The proposed product divides authoring and runtime responsibilities:

1. **Dialpad Agentic AI configuration:** A business admin defines the agent's purpose, tone, knowledge, skills, connector actions, guardrails, confirmation requirements, and escalation rules. Skills specify what an action should accomplish and which operation it may call. A business can test the agent's responses before connecting it to a channel. These capabilities are documented today; they are the starting point for Tap's conversation behavior.
2. **Dialpad workflows and channels:** Digital workflows can send text or media, present response buttons in Webchat, evaluate conditions, call external APIs, and transfer to a person. Channel settings determine where the agent launches and how human routing behaves. These are appropriate for deterministic entry, routing, and fallback steps. They do not, by themselves, demonstrate Tap's live in-app voice takeover.
3. **Studio-authored adaptive experience — hackathon work:** Studio must let an author give the agent a visual vocabulary and rules: when a visual would help, which components are allowed, which connector result fields may fill them, what requires explicit customer confirmation, and what to show when data is missing. The agent chooses an appropriate moment and allowed composition during the conversation; authorized systems supply the facts; the host app validates and renders the result. The hackathon will design and extend Studio for this authoring and preview path, then prove one authored visual in a live Tap conversation. This is a Studio product improvement, not a collection of cards hardcoded only in the customer app. **The accessible checkout and public docs did not verify an existing editor for it.**
4. **One live session:** A shared Tap session must connect the agent, the app's voice/text UI, and the receiving human's workspace. This is the product's decisive runtime behavior, not an authoring feature. Existing digital and voice paths are visible in the audited code, but their combination into one in-app conversation remains unproven.

The read-only audit used the locally available `origin/master` snapshot from **16 October 2026**. A further read-only check on **25 October 2026** found the Dialpad web client dynamically loads Studio as an external `dx-console` web component and passes it company, auth, route, and experiment context. The available build-agent code carries skills, tools, and transfer targets, but the production Studio editor source is outside this checkout. A separate Beacon/Design Studio prototype has agent, skill, and workflow models and editor/testing routes, with local IndexedDB data; it is an available design exploration surface, **not proof of production Studio behavior**. The Kare/DX runtime and mobile SDK source were also unavailable here. These findings identify an integration boundary and a prototype starting point, **not** proof that production Studio already has or lacks visual authoring. Obtain the owning Studio source and a provisioned tenant, inspect its skill editor, preview/test surface, and persistence/API contracts, then choose the smallest native extension point. The same-session handoff remains a separate runtime proof.

### How a business would add Tap to its product

This is the **proposed integration contract**, not an SDK that exists today. Gate 0 must determine which parts Dialpad already provides and which Tap must build.

1. **Install and configure:** Add a small web package or embed to the website, and an iOS/Android package or supported native binding to the apps. In Dialpad's admin surface, connect the AI agent, approved knowledge and actions, a human queue, hours, and appearance. Give the business a test environment before production.
2. **Establish identity securely:** The host app authenticates its customer as it does today. Its backend asks Dialpad for a short-lived Tap session credential tied to the authorized customer and business. The browser or mobile app never supplies a trusted account ID or a long-lived Dialpad secret on its own. Anonymous visitors get only the capabilities the business explicitly allows.
3. **Place the entry point:** The host chooses where Tap appears and launches the same conversation UI. The integration exposes start, resume, end, mic and speaker controls, typing, and on-screen result or confirmation cards. A typed event contract connects Studio-authored visual intent and approved skill/action results to reusable components; the host app renders them. The business can style the entry point and surface while preserving clear AI-versus-human identity and accessible controls. The hackathon must establish how to author and preview that mapping in Studio.
4. **Keep one session:** The client retains a Tap conversation identifier across voice and text, app navigation, temporary disconnects, and a supported return to the app. Dialpad owns the authoritative event history, current conversation owner, and transfer state. The client renders those updates instead of starting a new chat on every mode change.
5. **Route to a person:** The business maps the Tap session to its configured Dialpad queue. At takeover, the agent workspace receives the live media path plus authorized transcript, customer context, AI findings, attempted actions, and unresolved request. The customer remains in the host app. If live takeover is unavailable, the UI states that clearly and offers the configured fallback.
6. **Test before launch:** Ship a sample web page and sample iOS/Android apps, setup guide, test agent and queue, and a diagnostics view. A business should be able to run voice, typing, human takeover, reconnection, and permission-failure checks without custom work from the Tap team.

The web embed and mobile packages should present the **same Tap session contract**. Their UI and platform media code may differ. The live voice path, identity boundary, and event model must be proven in Gate 0 before the team freezes any public SDK API.

## One Dialpad story to build first

Prove Tap with a **Dialpad support question in Dialpad's own surfaces**: “Can I change where my calls ring?” Use a test company and account. This question works as a public help question on Dialpad's website; when signed in to Dialpad's web or mobile app, the agent can also consult a controlled test setting. Do not expose account details to an unauthenticated website visitor.

1. A visitor opens Tap on a Dialpad web surface, asks by voice, and sees the conversation. Repeat in the Dialpad iOS and Android apps.
2. The AI answers from approved Dialpad guidance. In a signed-in test session, it retrieves the relevant test account's routing setting through an authorized service.
3. The customer asks a follow-up without restating the question. The AI shows the returned setting and an accurate next step.
4. If an allowed test-account change is feasible, the agent asks for confirmation, makes the change, and shows a result only after the service confirms it. Otherwise, keep the hackathon proof read-only and mark action execution unproven.
5. The customer asks for a person. A Dialpad test support agent receives the live voice session and the relevant story; the customer remains on the same Dialpad site or app surface. Repeat the handoff in text and on each platform.

The four industry slides on the Tap website show the *future market*. They are not four integrations to build for this hackathon.

## Execution sequence and gates

### Presentation track: maintain the existing Tap demo

**Work:** Keep the published Clearway preview accurate as the product proof develops. Rehearse the full watch-only story with a new reviewer and ask what they believe is live versus scripted, what Maya completed, and what Sam did. Make any changes locally and publish only after review. Do not turn Maya's simulated actions into required visitor clicks.

**Gate:** The visitor can tell the preview is scripted; Maya's simulated confirmation happens before the transfer result; Sam's document review remains pending; optional feedback and return to the Clearway home screen make the story feel complete. This is a communication gate, not a live-agent gate.

### 0. Inventory the real Dialpad path

**Work:** Obtain a test Dialpad company with Agentic AI and Digital Contact Center access, a test human agent, and access to Dialpad's website/web client, iOS app, Android app, the production Studio/DX editor source and tenant, Kare, mobile SDK, and routing code. Identify the exact website/web-app entry point the team owns. Inspect Webchat, agent launch, native bindings, voice session transport, routing, and agent desktop. In production Studio, trace the skill editor, action result schema, preview/test loop, configuration persistence, and the API or extension mechanism for adding visual authoring. Review the separate Beacon/Design Studio prototype as a design reference only. Attempt to define and preview a visual tied to a connector action. Run current product flows before changing code.

**Competitive check in parallel:** Try the closest available Sierra, Fin, Glia, Amazon Connect, and Twilio flows or obtain product-led demos. Run the same scenario across each: in-app voice start, on-screen result/action, switch to typing, live human voice takeover, retained context, and business installation. Record what was observed, what the vendor only documents, what required assembly, and what could not be tested. Do not mark an undocumented capability absent. Estimate total cost with the same traffic, staffing, AI usage, implementation, and maintenance assumptions before claiming a cost advantage.

**Output:** A one-page Dialpad capability matrix: shipped as-is / configurable / needs code / unavailable, for Studio-authored skills and workflows, card authoring/preview, structured action results, web text, web voice, iOS text/voice, Android text/voice, human text/voice takeover, voice-text continuity, identity, and handoff context. Add a separate evidence-based competitor comparison and a cost-model worksheet; do not mix public claims with observed behavior.

**Gate:** The team can name the Studio code owner, the exact editor and persistence extension points, the runtime event contract, and the client renderer boundary, as well as the connection point for each other missing piece. If Studio access is unavailable, record the blocker and keep the authoring feature unverified; a mock Studio screen does not pass this gate. State a defensible customer benefit versus the closest tested alternatives before making exclusivity claims.

### 1. Configure the agent and data boundary

**Work:** Create one test AI agent in Dialpad's Agentic AI authoring surface, connect approved Dialpad help content, define a call-routing help skill, add a controlled test-account lookup, and define action confirmation and escalation rules. Have one action return an authorized, structured result. Keep customer identity and authorization on the service side; never trust a claim in the conversation as authorization.

**Output:** Reproducible agent configuration, controlled test settings for enabled/disabled/unknown/wrong-customer states, connector contract, and observed responses.

**Gate:** Correct answers come from the returned facts; wrong-customer access is rejected; unknown data triggers clarification or escalation; a write result is stated only after confirmed success.

### 1A. Extend Studio to author Tap's adaptive UX

**Work:** Use the extension points established in Gate 0 to add an authoring path within Studio's agent/skill workflow. Let the author describe the *intent* of a visual, choose or compose from approved components, bind required fields to a connector's structured result, define when it may appear, define the customer's confirmation action and fallback, and preview real conversation states with controlled test data. The agent chooses whether and when to emit an allowed visual; it cannot invent rates, statuses, or completed actions. Define one versioned event contract carrying visual intent, component data, provenance, and actions from Agentic to Tap's web/iOS/Android renderers. Start with one useful result visual and one confirmation state; the editor should be reusable for other skills rather than special-cased to this demo.

**Output:** A working Studio authoring and preview slice, its saved configuration, an agent-to-client event contract, reusable client component definitions, and a short authoring walkthrough. Show the difference between author-supplied rules, agent choice, connector data, and customer action.

**Gate:** A teammate can use Studio to configure the visual for the test skill, preview valid/missing/error results, run the agent, and see the authored visual appear at the appropriate point inside the Dialpad test app. The card shows values from the authorized connector result, never invented values; any action requires explicit customer confirmation and a confirmed service response. A hardcoded card in the app, a prompt-only instruction, or a static Studio mock does **not** pass this gate.

### 2. Prove same-thread text handoff in Dialpad's own surfaces

**Work:** Add a Tap entry point to the chosen Dialpad web surface and iOS/Android test builds, reusing existing clients where possible. Route an AI conversation to a test Digital Contact Center agent. Observe the customer's thread and the agent desktop on each platform.

**Gate:** A person can reply in the same text conversation and see enough context to continue without asking the customer to start over. Record exactly which context fields survive.

### 3. Prove live embedded voice takeover — the decisive gate

**Work:** Start AI voice inside Dialpad's web surface, then transfer to a human while the customer stays there. Repeat inside the Dialpad iOS and Android test builds. Observe audio continuity, latency, transcript, ownership changes, agent context, and recovery after interruption.

**Pass:** The human can speak live to the customer in the same on-screen session with relevant context. **Fail:** Tap opens a separate telephone call, asks for a callback, creates a ticket, loses the session, or only transfers text. A fail triggers a scoped engineering design for the missing voice/session bridge; it does not redefine the product promise.

### 4. Make voice and typing one conversation

**Work:** Establish a shared session identity and event history. Let the customer switch between voice and typing without losing the AI's findings or the person's context. Show clear AI/human, listening/speaking, waiting/connected, and failure states.

**Gate:** A tester can start in voice, type a follow-up, and have a person continue with the full story; the inverse path also works where supported. No duplicated or out-of-order actions.

### 5. Package the business installation

**Work:** Turn the proposed integration contract above into a versioned web package/embed and iOS/Android SDKs or supported native bindings, with a backend-issued session credential, start/resume/end methods, voice/text and ownership events, the Studio-authored visual event contract, reusable on-screen components, error/reconnect states, and an explicit human-routing configuration. Reuse current Dialpad bindings where they meet the contract; build only the missing bridge. Provide sample host apps, setup guides, a test agent and queue, and diagnostics. Keep adaptive-UX authoring and preview in Studio; place other business configuration in the appropriate existing Dialpad admin surface after code and ownership review. Demonstrate the buyer's path in four steps: install Tap, connect approved knowledge and actions, author the customer view and human routing, and run a test conversation. Show where the business would inspect resolved work, handoffs, failures, and cost, without treating the illustrated admin screen as a built product.

**Gate:** A teammate who did not build Tap can install each sample, securely identify a test customer, connect the test agent and queue, start and resume one session, move between voice and typing, reach a live person with context, and recover from a denied mic or interrupted connection using only the package and its guide. Track setup time, code changes, and failures separately for web, iOS, and Android.

### 6. Make the Dialpad proof repeatable, then recruit a pilot

**Work:** Re-run the journey on Dialpad's website/web app, iOS, and Android from clean test installs. Document exactly what was configured versus coded. Once the reusable install package passes, recruit a business pilot; its own app and APIs are a later integration, not part of this hackathon plan.

**Gate:** A new teammate can reproduce the Dialpad journey on all three platforms, with no cross-account leakage and a working live takeover. A later pilot business can use the package without rebuilding Tap's conversation and routing core.

### 7. Pilot and decide

**Work:** Run a small, consented pilot. Compare with current support on task completion, repeat contacts, time to resolution, handoff success, voice reliability, customer satisfaction, agent effort, installation time, and total cost per resolved issue.

**Gate:** Product, support, engineering, privacy/security, and commercial owners agree on launch thresholds and whether the experience is good enough to expand.

## Hackathon cut: what to aim to show

The hackathon should produce a **real, inspectable slice**, not just a polished video:

- Live Tap vision website with a clearly labeled scripted Clearway preview, plus a **separate working** Tap entry point in Dialpad's own web experience and iOS/Android test builds.
- Synthetic-data lookup with one useful, confirmed result.
- One visual authored and previewed in Studio, emitted by the agent when relevant, filled from the structured lookup, and rendered in the Dialpad test app. Show the Studio improvement as part of the hackathon demo.
- Same-thread text handoff to a test human.
- A recorded pass/fail result for embedded AI voice-to-live-human takeover; if it fails, a concrete engineering design and next owner for the missing path.
- A short installation rehearsal by someone outside the core build team.
- A clear distinction among scripted Clearway behavior, the four illustrative industries, and capabilities actually demonstrated live in Dialpad's own surfaces.

The **release bar remains the full voice + text + human + easy-install experience**. A text-only hackathon slice is progress, not completion of Tap.

## Decisions to make with the team

1. Which Dialpad test tenant, entitlements, and human support queue can we use immediately?
2. Who owns the Studio/DX source, skill editor, preview loop, and saved agent configuration? Which native extension point can carry adaptive visual intent and field bindings? Studio is the authoring home for this feature; choose the exact route after source inspection.
3. Can existing Dialpad infrastructure preserve a single voice-and-text session across AI and human? If not, what minimal bridge is required?
4. What exact context and identity may the host business pass, and what must be resolved server-side?
5. Which action is small enough to prove end to end with a confirmed backend result?
6. Which Dialpad website/web-app surface is the hackathon's web proof, and who owns the iOS and Android test builds?
7. What installation time and handoff quality make Tap commercially credible?
8. Against the closest tested alternative, what can Tap deliver with less setup or a better customer and agent journey, and what evidence supports that claim?

## Business hypothesis, competition, and potential moat

Tap is a potential extension of Dialpad's AI-agent and contact-center business, sold to companies that want service inside their own digital products. Packaging, pricing, margins, and demand need validation. The value proposition is **completed customer work with continuous human help**, not simply another chatbot or another contact button.

**Evidence snapshot, 24 October 2026.** These are public product descriptions, not completed hands-on tests. They do **not** support the claim that nobody else offers the full Tap journey.

| Benchmark | Publicly documented capability | What Tap must test against it |
| --- | --- | --- |
| [Sierra](https://sierra.ai/blog/multimodal-agents) | Its September 2026 multimodal release brings voice, text, and visual/interactive components into one agent conversation, including customer-built MCP UI components. | Whether a live person can take over the same **in-app voice** session with context, and how much work customer deployment requires. The linked release does not establish that exact human takeover path. |
| [Fin, now part of Salesforce](https://production.fin.ai/blog/salesforce-completes-acquisition-of-fin) | [Fin chat](https://www.intercom.com/help/en/articles/8286630-deploy-fin-ai-agent-over-chat) deploys to web, iOS, and Android with teammate handoff. [Fin Voice](https://www.intercom.com/help/en/articles/12918513-use-fin-voice-in-phone-workflows) is documented for phone workflows and human escalation, not as AI voice in its mobile Messenger. Salesforce completed the acquisition in September 2026. | Ease of install, quality of the Messenger handoff, and whether its voice and digital roadmap closes Tap's proposed gap. Do not describe Fin as unable to do in-app support. |
| [Glia](https://www.glia.com/high-touch-interactions) | In banking, Glia documents digital support in web/mobile properties, contextual human assistance, and a move from chat to digital voice with the same human agent. It also describes AI automation and prebuilt integrations. | AI-voice-to-human continuity in the same host app and whether Tap can win outside or within banking on experience, setup, and economics. Do not dismiss Glia as lacking easy installation without testing. |
| [Amazon Connect Customer](https://aws.amazon.com/products/connect/customer/features/) | AWS documents AI self-service across voice and digital channels with context-preserving human escalation, plus [in-app and web calling via widget or SDK](https://docs.aws.amazon.com/connect/latest/adminguide/inapp-calling.html). Its product page also describes Live Sync between voice and on-screen UI. | The exact combined AI-to-human **in-app voice** journey, effort to configure it, and total cost. AWS is a close platform benchmark, not a generic chatbot comparison. |
| [Twilio Agent Connect + Flex](https://www.twilio.com/docs/conversations/solution-blueprints/ai-to-human-handoff) | Twilio documents an AI-to-human transfer in the same call or chat window with an AI summary for the live agent, implemented through Agent Connect, Studio, and Flex. | Whether Tap can package the equivalent branded host-app journey with less assembly, while retaining voice/text context and a clear human ownership state. |

**The Dialpad bet:** Dialpad has already built the voice infrastructure behind customer service: live calls, human routing, and the workspace where agents take over. Tap would bring that strength into a business's app. A customer starts speaking to Dialpad AI there; when they need a person, Dialpad's telephony and routing systems would connect an agent to the **same live in-app voice conversation** with its context intact. The customer stays in the app, with no number to dial and no story to repeat. The AI model alone is not the moat. The opportunity is to connect Dialpad's existing voice engine, [AI agents on digital and voice channels with native mobile bindings](https://help.dialpad.com/hc/en-us/articles/54542536836891-Create-an-Agentic-AI-Agent), and [embedded Webchat with Digital Contact Center routing](https://help.dialpad.com/hc/en-us/articles/54367106894491-Create-a-Webchat-Channel) into one reliable experience businesses can install. **That exact end-to-end handoff is the product hypothesis to build and prove.** It is not an exclusivity claim: AWS, Twilio, and Glia also document substantial voice and contact-center capabilities. Shared voice/text context, installation effort, and lower total cost also remain unproven for Tap.

**Positioning test:** Keep “Talk to the app” as the customer-facing invitation. Demonstrate the more specific reason a buyer should care: a customer speaks inside their own app, receives a useful on-screen result, and a person can join the same live voice conversation with the full story. Confirm whether buyers value that complete journey, repeatable installation, and measurable resolution enough to switch or expand spend. Do not claim first-to-market or “live in a day” until comparable implementations and timing have been tested.

## Risks and ground rules

- **Voice handoff may require product engineering.** Determine this first. Do not substitute a phone call or callback and call the north star complete.
- **Cross-platform continuity is easy to promise and hard to prove.** Test web, iOS, and Android separately, then test moving modes and resuming a conversation.
- **Customer data requires server-side authorization.** Every lookup and action is checked against the signed-in customer; account IDs supplied in chat are not trusted.
- **The agent must not invent facts or success.** Action responses and failure states come from the authoritative backend.
- **Human availability varies.** Show an accurate queue or fallback rather than claiming a person has joined early.
- **Voice needs privacy and usability review.** Handle mic permission, recording/transcript notice, retention, noisy environments, accents, and interruptions before a customer pilot.
- **The website is a vision site with a scripted preview.** Keep the preview visibly identified as scripted and the carousel industries identified as illustrations. Do not present prerecorded voices, simulated Face ID, an illustrated admin panel, or Sam's scripted arrival as live integrations.
- **The watch-only demo simulates authorization.** Maya's Face ID confirmation is part of the scripted story, not a real approval or a visitor interaction. A working Tap product must wait for authenticated customer confirmation and a confirmed backend result before showing success.
- **Do not claim the higher-limit request is finished.** Sam has only begun a document review; the next step and expected review window should remain visible in the story and closing message.

## Source notes

Dialpad documents [Agentic AI setup, skills, escalation, and native bindings](https://help.dialpad.com/hc/en-us/articles/54542536836891-Create-an-Agentic-AI-Agent), [digital workflow steps including text, media, response buttons, branching, APIs, and transfer](https://help.dialpad.com/hc/en-us/articles/55711891127451-Workflow-Steps-Digital), [embeddable Webchat with human routing](https://help.dialpad.com/hc/en-us/articles/54367106894491-Create-a-Webchat-Channel), and [voice/digital/shared workflows](https://help.dialpad.com/hc/en-us/articles/55206515822235-Workflows). These support the investigation, not a claim that Tap's adaptive cards or complete journey are already shipped. [Google A2UI](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/) is a reference for letting an agent compose from an approved component catalog while the host app renders it; it is **not** evidence that Dialpad uses A2UI. The read-only source checks found an external Studio wrapper rather than Studio's implementation, so verify the authoring UI and runtime in the actual tenant and owning codebases before implementation decisions.
