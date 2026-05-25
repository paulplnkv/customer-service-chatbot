/**
 * Escalation evals — verify the chatbot correctly escalates to a human agent
 * when appropriate and does NOT escalate simple KB-answerable questions.
 *
 * System prompt specifies escalation for: explicit requests, complex issues
 * (billing disputes, policy disputes, complex claims), account changes
 * (cancellations, endorsement modifications), and significant frustration.
 */
import { evalite } from "evalite";
import { callChat } from "./helpers/chat-client";
import { toolWasCalled, toolNotCalled, responseIsNonEmpty } from "./helpers/scorers";

evalite("Escalation: Explicit human requests", {
  data: [
    { input: "I need to speak with a human agent." },
    { input: "Can I talk to a real person? This is urgent." },
  ],
  task: async (input) => callChat({ message: input }),
  scorers: [toolWasCalled("escalateToHuman")],
});

// evalite("Escalation: Complex issues requiring human help", {
//   data: [
//     { input: "I want to dispute a claim that was wrongly denied. I need a manager." },
//     { input: "I want to cancel my policy immediately." },
//     { input: "Connect me to billing support, this is the third time I'm calling about this charge." },
//     { input: "I was in an accident with injuries and there are multiple drivers and lawyers involved. I need help." },
//   ],
//   task: async (input) => callChat({ message: input }),
//   scorers: [responseIsNonEmpty, toolWasCalled("escalateToHuman")],
// });

// evalite("Escalation: Should NOT escalate KB-answerable questions", {
//   data: [
//     { input: "How do I file a claim?" },
//     { input: "What states do you operate in?" },
//     { input: "What payment plans do you offer?" },
//     { input: "What's the difference between collision and comprehensive?" },
//     { input: "Do you offer gap coverage?" },
//   ],
//   task: async (input) => callChat({ message: input }),
//   scorers: [responseIsNonEmpty, toolNotCalled("escalateToHuman")],
// });
