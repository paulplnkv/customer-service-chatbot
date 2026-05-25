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
    { input: "What payment plans do you offer for auto insurance premiums?" },
    { input: "What happens if I miss a payment on my auto policy?" },
  ],
  task: async (input) => callChat({ message: input }),
  scorers: [
    responseIsNonEmpty,
    toolWasCalled("searchKnowledgeBase"),
    groundedInToolResults,
    answerIsHelpful,
  ],
});

// evalite("Quality: Claims process", {
//   data: [
//     { input: "How do I file an auto claim after a car accident?" },
//     { input: "What information do I need to report a claim?" },
//     { input: "What are the different claim statuses I might see?" },
//     { input: "How does subrogation work if the other driver was at fault?" },
//   ],
//   task: async (input) => callChat({ message: input }),
//   scorers: [
//     responseIsNonEmpty,
//     toolWasCalled("searchKnowledgeBase"),
//     groundedInToolResults,
//     answerIsHelpful,
//   ],
// });

// evalite("Quality: Coverage & policy info", {
//   data: [
//     { input: "What's the difference between collision and comprehensive coverage?" },
//     { input: "What does 100/300/100 mean for liability limits?" },
//     { input: "Is uninsured motorist coverage required in Texas?" },
//     { input: "Does my Pinnacle policy cover me if I drive into Mexico?" },
//   ],
//   task: async (input) => callChat({ message: input }),
//   scorers: [
//     responseIsNonEmpty,
//     toolWasCalled("searchKnowledgeBase"),
//     groundedInToolResults,
//     answerIsHelpful,
//   ],
// });

// evalite("Quality: Endorsements & add-ons", {
//   data: [
//     { input: "Do you offer gap coverage for my auto loan?" },
//     { input: "How does accident forgiveness work?" },
//     { input: "What does the ride-share endorsement cover?" },
//     { input: "Do you have roadside assistance? What does it include?" },
//   ],
//   task: async (input) => callChat({ message: input }),
//   scorers: [
//     responseIsNonEmpty,
//     toolWasCalled("searchKnowledgeBase"),
//     groundedInToolResults,
//     answerIsHelpful,
//   ],
// });

// evalite("Quality: Products & pricing", {
//   data: [
//     { input: "What coverage packages does Pinnacle offer?" },
//     { input: "What's included in the Premier plan?" },
//     { input: "What discounts are available on my auto policy?" },
//     { input: "What factors affect my auto insurance premium?" },
//   ],
//   task: async (input) => callChat({ message: input }),
//   scorers: [
//     responseIsNonEmpty,
//     toolWasCalled("searchKnowledgeBase"),
//     groundedInToolResults,
//     answerIsHelpful,
//   ],
// });

// evalite("Quality: FAQ - common customer questions", {
//   data: [
//     { input: "How do I get my proof of insurance ID card?" },
//     { input: "Do I need to list all drivers in my household on my policy?" },
//     { input: "My child is going to college out of state. Are they still covered?" },
//     { input: "Is my car covered if it gets damaged by hail?" },
//     { input: "Does my policy cover personal belongings stolen from my car?" },
//   ],
//   task: async (input) => callChat({ message: input }),
//   scorers: [
//     responseIsNonEmpty,
//     toolWasCalled("searchKnowledgeBase"),
//     groundedInToolResults,
//     answerIsHelpful,
//   ],
// });
