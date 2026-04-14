import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Question, DimensionWeights } from '../types';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Save, X, Database } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

const SEED_QUESTIONS: Partial<Question>[] = [
  // Section 1: Thinking Style (1–10)
  {
    text: "When you start a new project, what do you do first?",
    textAr: "عندما تبدأ مشروعاً جديداً، ماذا تفعل أولاً؟",
    active: true,
    order: 1,
    options: [
      { text: "Assign tasks to the team", textAr: "توزيع المهام على الفريق", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Create a clear plan", textAr: "إنشاء خطة واضحة", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Talk to people to understand requirements", textAr: "التحدث مع الناس لفهم المتطلبات", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Generate creative ideas", textAr: "توليد أفكار إبداعية", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Analyze the problem deeply", textAr: "تحليل المشكلة بعمق", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Start executing immediately", textAr: "البدء في التنفيذ فوراً", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "You prefer working in:",
    active: true,
    order: 2,
    options: [
      { text: "Leading a team", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Organizing tasks", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Communicating with people", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Creating new ideas", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Solving problems", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Executing tasks", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "When facing a problem:",
    active: true,
    order: 3,
    options: [
      { text: "Lead a discussion with the team", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Go back to the plan", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Ask someone experienced", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Think outside the box", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Analyze root causes", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Try quick solutions", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "Your strongest trait is:",
    active: true,
    order: 4,
    options: [
      { text: "Decision making", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Organization", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Persuasion", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Creativity", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Logical thinking", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Fast execution", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "If a project fails:",
    active: true,
    order: 5,
    options: [
      { text: "Take responsibility", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Review the plan", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Check communication gaps", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Think of new ideas", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Analyze the reasons", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Restart quickly", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "When someone asks for help:",
    active: true,
    order: 6,
    options: [
      { text: "Guide them", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Organize their work", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Explain clearly", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Give creative ideas", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Analyze their issue", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Help them practically", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "You prefer to be:",
    active: true,
    order: 7,
    options: [
      { text: "The leader", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "The organizer", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "The communicator", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "The creator", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "The analyst", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "The executor", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "In your free time, you prefer:",
    active: true,
    order: 8,
    options: [
      { text: "Developing leadership skills", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Organizing your life", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Meeting people", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Creating something new", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Learning analytical skills", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Doing practical work", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "You enjoy:",
    active: true,
    order: 9,
    options: [
      { text: "Controlling project direction", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Following systems", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Talking to people", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Innovating", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Analyzing", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Executing", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "What annoys you the most?",
    active: true,
    order: 10,
    options: [
      { text: "Lack of leadership", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Chaos", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Poor communication", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Routine work", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Illogical decisions", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Delays", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  // Section 2: Work Style (11–20)
  {
    text: "You prefer work that is:",
    active: true,
    order: 11,
    options: [
      { text: "Team-led by you", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Well-organized", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Communication-based", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Open to creativity", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Analytical", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Practical", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "When facing a deadline:",
    active: true,
    order: 12,
    options: [
      { text: "Delegate tasks", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Set priorities", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Follow up with the team", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Think creatively", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Focus on solving the problem", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Work fast", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "In a team, people see you as:",
    active: true,
    order: 13,
    options: [
      { text: "A leader", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Organized", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "A communicator", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Creative", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "A thinker", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Hardworking", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "If someone disagrees with you:",
    active: true,
    order: 14,
    options: [
      { text: "Lead them to the right decision", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Refer to the plan", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Discuss with them", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Suggest new ideas", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Explain logically", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Apply the solution", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "You enjoy projects that involve:",
    active: true,
    order: 15,
    options: [
      { text: "Leadership", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Organization", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "People interaction", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Creativity", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Analysis", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Execution", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "Under pressure:",
    active: true,
    order: 16,
    options: [
      { text: "Take control", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Organize tasks", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Communicate calmly", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Think creatively", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Stay focused", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Deliver results", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "You learn best through:",
    active: true,
    order: 17,
    options: [
      { text: "Leading", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Planning", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Discussion", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Experimentation", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Analysis", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Practice", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "You are more:",
    active: true,
    order: 18,
    options: [
      { text: "Decisive", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Organized", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Social", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Imaginative", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Logical", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Practical", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "When facing a big issue:",
    active: true,
    order: 19,
    options: [
      { text: "Take control", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Structure it", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Talk with the team", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Generate ideas", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Analyze it", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Solve it quickly", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "You prefer to:",
    active: true,
    order: 20,
    options: [
      { text: "Lead", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Organize", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Communicate", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Create", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Think", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Execute", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  // Section 3: Skills & Role (21–30)
  {
    text: "Your ideal role is:",
    active: true,
    order: 21,
    options: [
      { text: "Team Leader", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Project Manager", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "PR / Communication", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Designer / Creative", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Analyst", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Executor", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "You enjoy the most:",
    active: true,
    order: 22,
    options: [
      { text: "Leading", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Organizing", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Talking", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Designing", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Analyzing", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Executing", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "If you choose a specialization:",
    active: true,
    order: 23,
    options: [
      { text: "Leadership", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Management", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Marketing / PR", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Design", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Data / Tech", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Operations", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "You prefer to:",
    active: true,
    order: 24,
    options: [
      { text: "Lead people", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Manage projects", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Interact with people", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Create ideas", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Analyze data", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Execute tasks", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "Your strength is:",
    active: true,
    order: 25,
    options: [
      { text: "Leadership", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Organization", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Communication", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Creativity", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Analysis", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Execution", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "In an event, you would:",
    active: true,
    order: 26,
    options: [
      { text: "Lead it", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Organize it", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Handle people", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Create ideas", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Analyze results", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Execute tasks", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "You prefer to be:",
    active: true,
    order: 27,
    options: [
      { text: "Responsible", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Organized", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "The face of the team", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Creative", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Analytical", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Productive", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "You succeed most in:",
    active: true,
    order: 28,
    options: [
      { text: "Leading", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Organizing", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Networking", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Creating", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Thinking", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Doing", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "You prefer to:",
    active: true,
    order: 29,
    options: [
      { text: "Control", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Structure", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Communicate", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "Innovate", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "Analyze", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "Execute", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  },
  {
    text: "At your core, you are:",
    active: true,
    order: 30,
    options: [
      { text: "A leader", weights: { leadership: 1, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "An organizer", weights: { leadership: 0, organization: 1, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: "A communicator", weights: { leadership: 0, organization: 0, communication: 1, creativity: 0, analysis: 0, execution: 0 } },
      { text: "A creator", weights: { leadership: 0, organization: 0, communication: 0, creativity: 1, analysis: 0, execution: 0 } },
      { text: "An analyst", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 1, execution: 0 } },
      { text: "An executor", weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 1 } },
    ]
  }
];

export default function AdminQuestions() {
  const { t, language } = useLanguage();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'primary';
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'primary'
  });

  const [formData, setFormData] = useState<Partial<Question>>({
    text: '',
    textAr: '',
    active: true,
    order: 0,
    options: [
      { text: '', textAr: '', weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: '', textAr: '', weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: '', textAr: '', weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: '', textAr: '', weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: '', textAr: '', weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
      { text: '', textAr: '', weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
    ]
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const q = query(collection(db, 'questions'), orderBy('order', 'asc'));
      let querySnapshot;
      try {
        querySnapshot = await getDocs(q);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'questions');
        return;
      }
      setQuestions(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question)));
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    if (questions.length > 0) {
      setConfirmModal({
        show: true,
        title: 'Seed Questions',
        message: 'Questions already exist. Do you want to add default questions anyway?',
        type: 'primary',
        onConfirm: executeSeed
      });
    } else {
      executeSeed();
    }
  };

  const executeSeed = async () => {
    setIsSeeding(true);
    try {
      for (const sq of SEED_QUESTIONS) {
        try {
          await addDoc(collection(db, 'questions'), sq);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'questions');
          return;
        }
      }
      toast.success("Default questions seeded successfully!");
      fetchQuestions();
    } catch (error) {
      console.error("Error seeding questions:", error);
      toast.error("Failed to seed questions");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSave = async () => {
    if (!formData.text || formData.options?.some(o => !o.text)) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      if (editingId) {
        try {
          await updateDoc(doc(db, 'questions', editingId), formData);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `questions/${editingId}`);
          return;
        }
        toast.success("Question updated");
      } else {
        try {
          await addDoc(collection(db, 'questions'), { ...formData, order: questions.length + 1 });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'questions');
          return;
        }
        toast.success("Question added");
      }
      setIsAdding(false);
      setEditingId(null);
      setFormData({
        text: '',
        active: true,
        order: 0,
        options: [
          { text: '', weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
          { text: '', weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
          { text: '', weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
          { text: '', weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
          { text: '', weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
          { text: '', weights: { leadership: 0, organization: 0, communication: 0, creativity: 0, analysis: 0, execution: 0 } },
        ]
      });
      fetchQuestions();
    } catch (error) {
      toast.error("Failed to save question");
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmModal({
      show: true,
      title: t('admin.deleteQuestion'),
      message: 'Are you sure you want to delete this question?',
      type: 'danger',
      onConfirm: () => executeDelete(id)
    });
  };

  const executeDelete = async (id: string) => {
    try {
      try {
        await deleteDoc(doc(db, 'questions', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `questions/${id}`);
        return;
      }
      toast.success("Question deleted");
      fetchQuestions();
    } catch (error) {
      toast.error("Failed to delete question");
    }
  };

  const handleDeleteAll = async () => {
    setConfirmModal({
      show: true,
      title: t('admin.deleteAllQuestions'),
      message: t('admin.confirmDeleteAll'),
      type: 'danger',
      onConfirm: executeDeleteAll
    });
  };

  const executeDeleteAll = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'questions'));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast.info("No questions to delete");
        setLoading(false);
        return;
      }

      const batch = writeBatch(db);
      querySnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      toast.success("All questions deleted successfully");
      fetchQuestions();
    } catch (error) {
      console.error("Error deleting all questions:", error);
      toast.error("Failed to delete all questions");
    } finally {
      setLoading(false);
    }
  };

  const updateOptionWeight = (optIdx: number, dimension: keyof DimensionWeights, value: number) => {
    const newOptions = [...(formData.options || [])];
    newOptions[optIdx].weights[dimension] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const updateOptionText = (optIdx: number, text: string, isAr: boolean = false) => {
    const newOptions = [...(formData.options || [])];
    if (isAr) {
      newOptions[optIdx].textAr = text;
    } else {
      newOptions[optIdx].text = text;
    }
    setFormData({ ...formData, options: newOptions });
  };

  return (
    <div className="space-y-12">
      <section id="questions">
        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-primary font-bold tracking-tight text-sm mb-1 uppercase">{t('admin.knowledgeBase')}</p>
            <h2 className="text-4xl font-extrabold text-primary tracking-tighter">{t('admin.questions')}</h2>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleDeleteAll}
              disabled={loading || questions.length === 0}
              className="bg-error/10 text-error px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-error/20 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">delete_sweep</span>
              {t('admin.deleteAllQuestions')}
            </button>
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="bg-surface-container-low text-primary px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 hover:bg-surface-container-high transition-all"
            >
              <span className="material-symbols-outlined text-sm">database</span>
              {isSeeding ? 'Seeding...' : 'Seed Defaults'}
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="bg-primary text-white px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              {t('admin.addQuestion')}
            </button>
          </div>
        </div>

        {(isAdding || editingId) && (
          <div className="bg-surface-container-lowest rounded-xl p-8 border border-primary/20 shadow-xl mb-12 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-primary tracking-tighter">{editingId ? t('admin.editQuestion') : t('admin.addQuestion')}</h3>
              <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">{t('admin.questionText')}</label>
                  <input
                    type="text"
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    className="w-full px-6 py-4 rounded-xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary text-lg font-medium transition-all"
                    placeholder="What is the primary objective of this inquiry?"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">{t('admin.questionTextAr')}</label>
                  <input
                    type="text"
                    value={formData.textAr}
                    onChange={(e) => setFormData({ ...formData, textAr: e.target.value })}
                    className="w-full px-6 py-4 rounded-xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary text-lg font-medium transition-all"
                    placeholder="ما هو الهدف الأساسي من هذا الاستفسار؟"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {formData.options?.map((option, idx) => (
                  <div key={idx} className="p-6 bg-surface-container-low rounded-xl border border-outline-variant/10">
                    <label className="block text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest mb-3">{t('admin.options')} {idx + 1}</label>
                    <div className="space-y-3 mb-4">
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => updateOptionText(idx, e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-surface-container-lowest border-none focus:ring-1 focus:ring-primary text-sm font-bold"
                        placeholder="Response variant (EN)..."
                      />
                      <input
                        type="text"
                        value={option.textAr}
                        onChange={(e) => updateOptionText(idx, e.target.value, true)}
                        className="w-full px-4 py-2 rounded-lg bg-surface-container-lowest border-none focus:ring-1 focus:ring-primary text-sm font-bold"
                        placeholder="خيار الرد (عربي)..."
                        dir="rtl"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {Object.keys(option.weights).map((dimension) => (
                        <div key={dimension}>
                          <label className="block text-[10px] font-bold text-on-surface-variant/40 uppercase truncate">{dimension}</label>
                          <input
                            type="number"
                            value={option.weights[dimension as keyof DimensionWeights]}
                            onChange={(e) => updateOptionWeight(idx, dimension as keyof DimensionWeights, parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-1.5 rounded bg-surface-container-lowest border-none focus:ring-1 focus:ring-primary text-xs font-black text-primary"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-10">
              <button
                onClick={() => { setIsAdding(false); setEditingId(null); }}
                className="px-8 py-3 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container-low transition-all"
              >
                {t('admin.cancel')}
              </button>
              <button
                onClick={handleSave}
                className="bg-primary text-white px-10 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              >
                {t('admin.save')}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {questions.map((q) => (
            <div key={q.id} className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-widest">{t('admin.index')}: {q.order}</span>
                    {!q.active && <span className="text-[10px] font-black text-error bg-error/10 px-2 py-0.5 rounded uppercase tracking-widest">{t('admin.inactive')}</span>}
                  </div>
                  <h4 className="text-xl font-bold text-primary tracking-tight leading-tight">
                    {language === 'ar' ? (q.textAr || q.text) : q.text}
                  </h4>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => { setEditingId(q.id); setFormData(q); }}
                    className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-xl transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 rounded-xl transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
              
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {q.options.map((opt, idx) => (
                  <div key={idx} className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/5">
                    <p className="font-bold text-primary text-sm mb-2 line-clamp-1">
                      {language === 'ar' ? (opt.textAr || opt.text) : opt.text}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(opt.weights).map(([dim, val]) => (
                        (val as number) > 0 && (
                          <span key={dim} className="px-2 py-0.5 bg-surface-container-lowest text-[9px] font-black text-on-surface-variant/60 uppercase tracking-tighter rounded border border-outline-variant/10">
                            {dim}: {val}
                          </span>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest p-8 rounded-3xl max-w-md w-full shadow-2xl border border-outline-variant/10 transform animate-in zoom-in-95 duration-200">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
              confirmModal.type === 'danger' ? "bg-error/10 text-error" : "bg-primary/10 text-primary"
            )}>
              <span className="material-symbols-outlined text-3xl">
                {confirmModal.type === 'danger' ? 'warning' : 'help'}
              </span>
            </div>
            <h3 className="text-2xl font-black text-primary tracking-tighter mb-2">{confirmModal.title}</h3>
            <p className="text-on-surface-variant leading-relaxed mb-8">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                className="px-6 py-2.5 rounded-xl font-bold text-on-surface-variant hover:bg-surface-container-low transition-all"
              >
                {t('admin.cancel')}
              </button>
              <button 
                onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, show: false }); }}
                className={cn(
                  "px-8 py-2.5 rounded-xl font-bold text-white transition-all shadow-lg",
                  confirmModal.type === 'danger' ? "bg-error shadow-error/20 hover:opacity-90" : "bg-primary shadow-primary/20 hover:opacity-90"
                )}
              >
                {confirmModal.type === 'danger' ? t('admin.delete') : t('admin.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
