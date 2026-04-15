import { LikertQuestion, OpenEndedQuestion } from "@/types/quiz";

export const likertQuestions: LikertQuestion[] = [
  { id: 1, text: "I often stop to appreciate perfection and grace in all its forms.", virtue: "Transcendence", strength: "Appreciation of Beauty" },
  { id: 2, text: "I am optimistic about the future and confident I will achieve my goals.", virtue: "Transcendence", strength: "Hope" },
  { id: 3, text: "Being connected to the heartbeat of your world is an essential part of wellbeing.", virtue: "Transcendence", strength: "Spirituality" },
  { id: 4, text: "Laughter is an essential part of my life. Sometimes I am even accused of not taking things seriously enough.", virtue: "Transcendence", strength: "Humor" },
  { id: 5, text: "It's easy for me to feel thankful and appreciate the good things in my life.", virtue: "Transcendence", strength: "Gratitude" },
  { id: 6, text: "Everyone should receive equal opportunities and justice without bias.", virtue: "Justice", strength: "Fairness" },
  { id: 7, text: "I help people work together toward shared goals.", virtue: "Justice", strength: "Leadership" },
  { id: 8, text: "I am always willing to set aside my needs to help my group achieve their goals.", virtue: "Justice", strength: "Teamwork" },
  { id: 9, text: "I enjoy being a warm person and expressing my emotions.", virtue: "Humanity", strength: "Love" },
  { id: 10, text: "I often perform small acts of courtesy or helpfulness.", virtue: "Humanity", strength: "Kindness" },
  { id: 11, text: "It's easy for me to start conversations and understand other people.", virtue: "Humanity", strength: "Social Intelligence" },
  { id: 12, text: "I make careful choices and think ahead.", virtue: "Temperance", strength: "Prudence" },
  { id: 13, text: "I stay modest and let actions speak for me.", virtue: "Temperance", strength: "Humility" },
  { id: 14, text: "I would describe myself as disciplined and not easily tempted.", virtue: "Temperance", strength: "Self-Regulation" },
  { id: 15, text: "I let go of grudges and give people another chance.", virtue: "Temperance", strength: "Forgiveness" },
  { id: 16, text: "I read often, enjoy documentaries, and attend educational events.", virtue: "Wisdom", strength: "Love of Learning" },
  { id: 17, text: "I often feel the need to learn more information about non-essential topics (sometimes I go down a \"rabbit hole\").", virtue: "Wisdom", strength: "Curiosity" },
  { id: 18, text: "I see situations from different angles and offer balanced advice.", virtue: "Wisdom", strength: "Perspective" },
  { id: 19, text: "Solving problems requires that all details be considered and approached slowly without emotion.", virtue: "Wisdom", strength: "Judgment" },
  { id: 20, text: "My world is a better place if I am free to create and express my uniqueness.", virtue: "Wisdom", strength: "Creativity" },
  { id: 21, text: "It's hard for me to enjoy an interaction if it's not sincere and genuine. I commit when I give my word to someone.", virtue: "Courage", strength: "Honesty" },
  { id: 22, text: "I enjoy a physical or mental challenge and have no problems expressing myself.", virtue: "Courage", strength: "Bravery" },
  { id: 23, text: "It bothers me to leave a task unfinished, so I avoid getting sidetracked.", virtue: "Courage", strength: "Perseverance" },
  { id: 24, text: "People would often describe me as energetic and enthusiastic.", virtue: "Courage", strength: "Zest" },
];

export const openEndedQuestions: OpenEndedQuestion[] = [
  {
    id: "social_preference",
    question: "Do you feel more alive in a small group, a big crowd, or your own company — and why?",
    type: "text",
    required: true,
  },
  {
    id: "interests",
    question: "What's something you could talk about or do for hours without getting bored?",
    type: "text",
    required: true,
  },
  {
    id: "looking_for",
    question: "What are you looking for in a friend?",
    type: "text",
    required: true,
  },
  {
    id: "availability",
    question: "Best times available for meetups or calls?",
    type: "multiselect",
    options: ["Weekday Mornings", "Weekday Afternoons", "Weekday Evenings", "Weekend Mornings", "Weekend Afternoons", "Weekend Evenings"],
    required: true,
  },
];

export const preferenceQuestions: OpenEndedQuestion[] = [
  {
    id: "group_matching",
    question: "I would like to be considered as a match for 1 on 1 or group matches.",
    type: "select",
    options: ["Yes", "No"],
    required: true,
    defaultValue: "Yes",
  },
  {
    id: "coaching",
    question: "Do you need tips or coaching to help make friends?",
    type: "select",
    options: ["Yes", "No"],
    required: true,
  },
  {
    id: "communication",
    question: "Preferred Communication",
    type: "multiselect",
    options: ["Text", "Email", "Phone", "Video Call", "In Person"],
    required: true,
  },
  {
    id: "relationship_status",
    question: "Relationship Status",
    type: "select",
    options: ["Single", "In a Relationship", "Married", "It's Complicated", "Prefer Not to Say"],
    required: false,
  },
  {
    id: "disability",
    question: "Physical Disability Requirements",
    type: "text",
    required: false,
  },
];
