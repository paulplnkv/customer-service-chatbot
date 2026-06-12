/**
 * Quality evals — verify the chatbot answers insurance questions accurately
 * using the knowledge base. Questions are grounded in actual KB content across
 * all 6 document domains: billing, claims, FAQ, coverage, endorsements, products.
 */
import { evalite } from "evalite";
import { callChat } from "./helpers/chat-client";
import {
  toolWasCalled,
  groundedInToolResults,
  answerIsHelpful,
  responseIsNonEmpty,
} from "./helpers/scorers";

evalite("Quality: Billing & payments", {
  data: [
    { input: "What payment plans are available for my aviation premium?" },
    { input: "What is minimum earned premium and why does it apply?" },
    { input: "How is my refund calculated if I cancel mid-term?" },
  ],
  task: async (input) => callChat({ message: input }),
  scorers: [
    responseIsNonEmpty,
    toolWasCalled("searchKnowledgeBase"),
    groundedInToolResults,
    answerIsHelpful,
  ],
});

evalite("Quality: Claims process", {
  data: [
    { input: "How do I file an aircraft claim?" },
    { input: "What do I do immediately after an accident or incident?" },
    { input: "Do I have to report a bird strike or hard landing?" },
    { input: "What is a constructive total loss?" },
  ],
  task: async (input) => callChat({ message: input }),
  scorers: [
    responseIsNonEmpty,
    toolWasCalled("searchKnowledgeBase"),
    groundedInToolResults,
    answerIsHelpful,
  ],
});

evalite("Quality: Coverage & policy info", {
  data: [
    { input: "What is the difference between in-flight and not-in-flight hull coverage?" },
    { input: "What does 'agreed value' mean and will my payout be depreciated?" },
    { input: "What is a Combined Single Limit (CSL)?" },
    { input: "Who is covered to fly my aircraft under the policy?" },
  ],
  task: async (input) => callChat({ message: input }),
  scorers: [
    responseIsNonEmpty,
    toolWasCalled("searchKnowledgeBase"),
    groundedInToolResults,
    answerIsHelpful,
  ],
});

evalite("Quality: Endorsements & add-ons", {
  data: [
    { input: "Does my policy cover flying to Mexico or the Bahamas?" },
    { input: "Can I add my aircraft lender as a loss payee?" },
    { input: "Is war and terrorism covered, and can I buy it back?" },
    { input: "Can I get a credit while my aircraft is grounded for the winter?" },
  ],
  task: async (input) => callChat({ message: input }),
  scorers: [
    responseIsNonEmpty,
    toolWasCalled("searchKnowledgeBase"),
    groundedInToolResults,
    answerIsHelpful,
  ],
});

evalite("Quality: Products & pricing", {
  data: [
    { input: "What coverage packages does STR offer?" },
    { input: "What is the difference between Preferred and Premier?" },
    { input: "What factors affect my premium?" },
    { input: "How do higher liability limits change my price?" },
  ],
  task: async (input) => callChat({ message: input }),
  scorers: [
    responseIsNonEmpty,
    toolWasCalled("searchKnowledgeBase"),
    groundedInToolResults,
    answerIsHelpful,
  ],
});

evalite("Quality: FAQ - common customer questions", {
  data: [
    { input: "What does it mean that my policy is 'surplus lines'?" },
    { input: "How long is my policy in force?" },
    { input: "Can I get a Certificate of Insurance for my airport or lender?" },
    { input: "Can a student pilot fly my insured aircraft?" },
  ],
  task: async (input) => callChat({ message: input }),
  scorers: [
    responseIsNonEmpty,
    toolWasCalled("searchKnowledgeBase"),
    groundedInToolResults,
    answerIsHelpful,
  ],
});
