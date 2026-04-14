import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc, doc, updateDoc, setDoc, query, orderBy, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Question, DimensionWeights, TestResponse } from '../types';
import { toast } from 'sonner';
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

const getWeights = (type: keyof DimensionWeights): DimensionWeights => ({
  leadership: type === 'leadership' ? 5 : 0,
  organization: type === 'organization' ? 5 : 0,
  communication: type === 'communication' ? 5 : 0,
  creativity: type === 'creativity' ? 5 : 0,
  analysis: type === 'analysis' ? 5 : 0,
  execution: type === 'execution' ? 5 : 0,
});

const SEED_QUESTIONS: Partial<Question>[] = [
  // Section 1: Thinking Style (1-10)
  {
    text: "When you get a new project, the first thing you do is:",
    textAr: "لما يجيلك مشروع جديد، أول حاجة تعملها:",
    active: true,
    order: 1,
    options: [
      { text: "Distribute tasks to the team", textAr: "أوزع المهام على الفريق", weights: getWeights('leadership') },
      { text: "Set a clear plan", textAr: "أحط خطة واضحة", weights: getWeights('organization') },
      { text: "Talk to people and understand the requirements", textAr: "أتكلم مع الناس وأفهمهم المطلوب", weights: getWeights('communication') },
      { text: "Think of different ideas", textAr: "أفكر في أفكار مختلفة", weights: getWeights('creativity') },
      { text: "Analyze the problem in detail", textAr: "أحلل المشكلة بالتفصيل", weights: getWeights('analysis') },
      { text: "Start execution immediately", textAr: "أبدأ تنفيذ فورًا", weights: getWeights('execution') },
    ]
  },
  {
    text: "You prefer to work more in:",
    textAr: "بتحب تشتغل أكتر في:",
    active: true,
    order: 2,
    options: [
      { text: "Leading the team", textAr: "قيادة الفريق", weights: getWeights('leadership') },
      { text: "Arranging and organizing work", textAr: "ترتيب وتنظيم الشغل", weights: getWeights('organization') },
      { text: "Dealing with people", textAr: "التعامل مع الناس", weights: getWeights('communication') },
      { text: "Innovating ideas", textAr: "ابتكار أفكار", weights: getWeights('creativity') },
      { text: "Solving problems", textAr: "حل المشاكل", weights: getWeights('analysis') },
      { text: "Executing tasks", textAr: "تنفيذ المهام", weights: getWeights('execution') },
    ]
  },
  {
    text: "When you face a problem:",
    textAr: "لما تواجه مشكلة:",
    active: true,
    order: 3,
    options: [
      { text: "Ask the team and lead the discussion", textAr: "أسأل الفريق وأقود النقاش", weights: getWeights('leadership') },
      { text: "Refer back to the plan", textAr: "أرجع للخطة", weights: getWeights('organization') },
      { text: "Talk to someone with experience", textAr: "أتكلم مع حد عنده خبرة", weights: getWeights('communication') },
      { text: "Think outside the box", textAr: "أفكر خارج الصندوق", weights: getWeights('creativity') },
      { text: "Analyze the causes", textAr: "أحلل الأسباب", weights: getWeights('analysis') },
      { text: "Try solutions quickly", textAr: "أجرب حلول بسرعة", weights: getWeights('execution') },
    ]
  },
  {
    text: "What distinguishes you most:",
    textAr: "أكتر حاجة تميزك:",
    active: true,
    order: 4,
    options: [
      { text: "Decision making", textAr: "اتخاذ القرار", weights: getWeights('leadership') },
      { text: "Organization", textAr: "التنظيم", weights: getWeights('organization') },
      { text: "Persuasion", textAr: "الإقناع", weights: getWeights('communication') },
      { text: "Creativity", textAr: "الإبداع", weights: getWeights('creativity') },
      { text: "Logical thinking", textAr: "التفكير المنطقي", weights: getWeights('analysis') },
      { text: "Speed in execution", textAr: "السرعة في التنفيذ", weights: getWeights('execution') },
    ]
  },
  {
    text: "If the project fails:",
    textAr: "لو المشروع فشل:",
    active: true,
    order: 5,
    options: [
      { text: "Take responsibility", textAr: "أتحمل المسؤولية", weights: getWeights('leadership') },
      { text: "Review the plan", textAr: "أراجع الخطة", weights: getWeights('organization') },
      { text: "See where communication went wrong", textAr: "أشوف التواصل كان فين غلط", weights: getWeights('communication') },
      { text: "Think of new ideas", textAr: "أفكر في أفكار جديدة", weights: getWeights('creativity') },
      { text: "Analyze the cause", textAr: "أحلل السبب", weights: getWeights('analysis') },
      { text: "Start over quickly", textAr: "أبدأ من جديد بسرعة", weights: getWeights('execution') },
    ]
  },
  {
    text: "When someone asks for your help:",
    textAr: "لما حد يطلب مساعدتك:",
    active: true,
    order: 6,
    options: [
      { text: "Guide them", textAr: "أوجهه", weights: getWeights('leadership') },
      { text: "Organize their work for them", textAr: "أنظم له شغله", weights: getWeights('organization') },
      { text: "Explain it well to them", textAr: "أشرحله كويس", weights: getWeights('communication') },
      { text: "Give them ideas", textAr: "أدي له أفكار", weights: getWeights('creativity') },
      { text: "Analyze their problem", textAr: "أحلل مشكلته", weights: getWeights('analysis') },
      { text: "Help them practically", textAr: "أساعده عمليًا", weights: getWeights('execution') },
    ]
  },
  {
    text: "You prefer:",
    textAr: "تفضل:",
    active: true,
    order: 7,
    options: [
      { text: "To be the leader", textAr: "تكون القائد", weights: getWeights('leadership') },
      { text: "To be the organizer", textAr: "تكون المنظم", weights: getWeights('organization') },
      { text: "To be the spokesperson", textAr: "تكون المتحدث", weights: getWeights('communication') },
      { text: "To be the creator", textAr: "تكون المبدع", weights: getWeights('creativity') },
      { text: "To be the analyst", textAr: "تكون المحلل", weights: getWeights('analysis') },
      { text: "To be the executor", textAr: "تكون المنفذ", weights: getWeights('execution') },
    ]
  },
  {
    text: "If you have free time:",
    textAr: "لو عندك وقت فاضي:",
    active: true,
    order: 8,
    options: [
      { text: "Develop leadership skills", textAr: "أطور مهارات قيادية", weights: getWeights('leadership') },
      { text: "Organize my life", textAr: "أرتب حياتي", weights: getWeights('organization') },
      { text: "Get to know people", textAr: "أتعرف على ناس", weights: getWeights('communication') },
      { text: "Do something creative", textAr: "أعمل حاجة إبداعية", weights: getWeights('creativity') },
      { text: "Learn something analytical", textAr: "أتعلم حاجة تحليلية", weights: getWeights('analysis') },
      { text: "Work on something practical", textAr: "أشتغل على حاجة عملية", weights: getWeights('execution') },
    ]
  },
  {
    text: "You like:",
    textAr: "بتحب:",
    active: true,
    order: 9,
    options: [
      { text: "Controlling the direction of work", textAr: "تتحكم في اتجاه الشغل", weights: getWeights('leadership') },
      { text: "Following a system", textAr: "تمشي على نظام", weights: getWeights('organization') },
      { text: "Talking to people", textAr: "تتكلم مع الناس", weights: getWeights('communication') },
      { text: "Innovating", textAr: "تبتكر", weights: getWeights('creativity') },
      { text: "Analyzing", textAr: "تحلل", weights: getWeights('analysis') },
      { text: "Executing", textAr: "تنفذ", weights: getWeights('execution') },
    ]
  },
  {
    text: "What annoys you most:",
    textAr: "أكتر حاجة بتضايقك:",
    active: true,
    order: 10,
    options: [
      { text: "Lack of a leader", textAr: "عدم وجود قائد", weights: getWeights('leadership') },
      { text: "Chaos", textAr: "فوضى", weights: getWeights('organization') },
      { text: "Poor communication", textAr: "سوء التواصل", weights: getWeights('communication') },
      { text: "Routine", textAr: "الروتين", weights: getWeights('creativity') },
      { text: "Illogical decisions", textAr: "قرارات غير منطقية", weights: getWeights('analysis') },
      { text: "Delay", textAr: "التأخير", weights: getWeights('execution') },
    ]
  },
  // Section 2: Work Style (11-20)
  {
    text: "You prefer working:",
    textAr: "تفضل الشغل:",
    active: true,
    order: 11,
    options: [
      { text: "With a team and being the leader", textAr: "مع فريق وتكون القائد", weights: getWeights('leadership') },
      { text: "Organized and specific", textAr: "منظم ومحدد", weights: getWeights('organization') },
      { text: "With communication", textAr: "فيه تواصل", weights: getWeights('communication') },
      { text: "Open to ideas", textAr: "مفتوح للأفكار", weights: getWeights('creativity') },
      { text: "With analysis", textAr: "فيه تحليل", weights: getWeights('analysis') },
      { text: "Practical", textAr: "عملي", weights: getWeights('execution') },
    ]
  },
  {
    text: "If you have a Deadline:",
    textAr: "لو عندك Deadline:",
    active: true,
    order: 12,
    options: [
      { text: "Distribute the work", textAr: "أوزع الشغل", weights: getWeights('leadership') },
      { text: "Arrange priorities", textAr: "أرتب الأولويات", weights: getWeights('organization') },
      { text: "Follow up with the team", textAr: "أتابع مع الفريق", weights: getWeights('communication') },
      { text: "Come up with ideas", textAr: "أطلع أفكار", weights: getWeights('creativity') },
      { text: "Focus on the solution", textAr: "أركز على الحل", weights: getWeights('analysis') },
      { text: "Work quickly", textAr: "أشتغل بسرعة", weights: getWeights('execution') },
    ]
  },
  {
    text: "In the team, people see you as:",
    textAr: "في الفريق، الناس بتشوفك:",
    active: true,
    order: 13,
    options: [
      { text: "A leader", textAr: "قائد", weights: getWeights('leadership') },
      { text: "An organizer", textAr: "منظم", weights: getWeights('organization') },
      { text: "A speaker", textAr: "متكلم", weights: getWeights('communication') },
      { text: "Creative", textAr: "مبدع", weights: getWeights('creativity') },
      { text: "A thinker", textAr: "مفكر", weights: getWeights('analysis') },
      { text: "A worker", textAr: "شغال", weights: getWeights('execution') },
    ]
  },
  {
    text: "If someone disagrees with you:",
    textAr: "لو حد مختلف معاك:",
    active: true,
    order: 14,
    options: [
      { text: "Lead them to the right point", textAr: "أقوده للنقطة الصح", weights: getWeights('leadership') },
      { text: "Refer back to the plan", textAr: "أرجع للخطة", weights: getWeights('organization') },
      { text: "Discuss it with them", textAr: "أناقشه", weights: getWeights('communication') },
      { text: "Propose a new idea", textAr: "أطرح فكرة جديدة", weights: getWeights('creativity') },
      { text: "Explain with logic", textAr: "أشرح بالمنطق", weights: getWeights('analysis') },
      { text: "Apply the solution", textAr: "أطبق الحل", weights: getWeights('execution') },
    ]
  },
  {
    text: "You like projects that:",
    textAr: "تحب المشاريع اللي:",
    active: true,
    order: 15,
    options: [
      { text: "Have leadership", textAr: "فيها قيادة", weights: getWeights('leadership') },
      { text: "Have organization", textAr: "فيها تنظيم", weights: getWeights('organization') },
      { text: "Have people", textAr: "فيها ناس", weights: getWeights('communication') },
      { text: "Have creativity", textAr: "فيها إبداع", weights: getWeights('creativity') },
      { text: "Have analysis", textAr: "فيها تحليل", weights: getWeights('analysis') },
      { text: "Have execution", textAr: "فيها تنفيذ", weights: getWeights('execution') },
    ]
  },
  {
    text: "Under work pressure:",
    textAr: "في ضغط الشغل:",
    active: true,
    order: 16,
    options: [
      { text: "Control the team", textAr: "أتحكم في الفريق", weights: getWeights('leadership') },
      { text: "Organize", textAr: "أنظم", weights: getWeights('organization') },
      { text: "Talk and calm things down", textAr: "أتكلم وأهدّي", weights: getWeights('communication') },
      { text: "Innovate", textAr: "أبتكر", weights: getWeights('creativity') },
      { text: "Focus", textAr: "أركز", weights: getWeights('analysis') },
      { text: "Achieve", textAr: "أنجز", weights: getWeights('execution') },
    ]
  },
  {
    text: "You learn faster through:",
    textAr: "بتتعلم أسرع عن طريق:",
    active: true,
    order: 17,
    options: [
      { text: "Leadership", textAr: "القيادة", weights: getWeights('leadership') },
      { text: "Planning", textAr: "التخطيط", weights: getWeights('organization') },
      { text: "Discussion", textAr: "النقاش", weights: getWeights('communication') },
      { text: "Experimentation", textAr: "التجربة", weights: getWeights('creativity') },
      { text: "Analysis", textAr: "التحليل", weights: getWeights('analysis') },
      { text: "Application", textAr: "التطبيق", weights: getWeights('execution') },
    ]
  },
  {
    text: "You are:",
    textAr: "أنت:",
    active: true,
    order: 18,
    options: [
      { text: "A decision maker", textAr: "صاحب قرار", weights: getWeights('leadership') },
      { text: "Organized", textAr: "منظم", weights: getWeights('organization') },
      { text: "Social", textAr: "اجتماعي", weights: getWeights('communication') },
      { text: "Imaginative", textAr: "خيالي", weights: getWeights('creativity') },
      { text: "Logical", textAr: "منطقي", weights: getWeights('analysis') },
      { text: "Practical", textAr: "عملي", weights: getWeights('execution') },
    ]
  },
  {
    text: "If there is a big problem:",
    textAr: "لو في مشكلة كبيرة:",
    active: true,
    order: 19,
    options: [
      { text: "Control it", textAr: "أتحكم فيها", weights: getWeights('leadership') },
      { text: "Arrange it", textAr: "أرتبها", weights: getWeights('organization') },
      { text: "Talk to the team", textAr: "أتكلم مع الفريق", weights: getWeights('communication') },
      { text: "Come up with ideas", textAr: "أطلع أفكار", weights: getWeights('creativity') },
      { text: "Analyze it", textAr: "أحللها", weights: getWeights('analysis') },
      { text: "Solve it quickly", textAr: "أحلها بسرعة", weights: getWeights('execution') },
    ]
  },
  {
    text: "You prefer to:",
    textAr: "تفضل:",
    active: true,
    order: 20,
    options: [
      { text: "Lead", textAr: "تقود", weights: getWeights('leadership') },
      { text: "Organize", textAr: "تنظم", weights: getWeights('organization') },
      { text: "Talk", textAr: "تتكلم", weights: getWeights('communication') },
      { text: "Create", textAr: "تبدع", weights: getWeights('creativity') },
      { text: "Think", textAr: "تفكر", weights: getWeights('analysis') },
      { text: "Execute", textAr: "تنفذ", weights: getWeights('execution') },
    ]
  },
  // Section 3: Skills and Role (21-30)
  {
    text: "The most suitable role for you:",
    textAr: "أنسب دور ليك:",
    active: true,
    order: 21,
    options: [
      { text: "Team Leader", textAr: "Team Leader", weights: getWeights('leadership') },
      { text: "Project Manager", textAr: "Project Manager", weights: getWeights('organization') },
      { text: "PR / Communication", textAr: "PR / Communication", weights: getWeights('communication') },
      { text: "Designer / Creative", textAr: "Designer / Creative", weights: getWeights('creativity') },
      { text: "Analyst", textAr: "Analyst", weights: getWeights('analysis') },
      { text: "Executor", textAr: "Executor", weights: getWeights('execution') },
    ]
  },
  {
    text: "What you enjoy most:",
    textAr: "أكتر حاجة بتستمتع بيها:",
    active: true,
    order: 22,
    options: [
      { text: "Leadership", textAr: "القيادة", weights: getWeights('leadership') },
      { text: "Organization", textAr: "التنظيم", weights: getWeights('organization') },
      { text: "Talking", textAr: "الكلام", weights: getWeights('communication') },
      { text: "Design", textAr: "التصميم", weights: getWeights('creativity') },
      { text: "Analysis", textAr: "التحليل", weights: getWeights('analysis') },
      { text: "Execution", textAr: "التنفيذ", weights: getWeights('execution') },
    ]
  },
  {
    text: "If you were to choose a specialization:",
    textAr: "لو هتختار تخصص:",
    active: true,
    order: 23,
    options: [
      { text: "Leadership", textAr: "Leadership", weights: getWeights('leadership') },
      { text: "Management", textAr: "Management", weights: getWeights('organization') },
      { text: "Marketing/PR", textAr: "Marketing/PR", weights: getWeights('communication') },
      { text: "Design", textAr: "Design", weights: getWeights('creativity') },
      { text: "Data/Tech", textAr: "Data/Tech", weights: getWeights('analysis') },
      { text: "Operations", textAr: "Operations", weights: getWeights('execution') },
    ]
  },
  {
    text: "You like:",
    textAr: "بتحب:",
    active: true,
    order: 24,
    options: [
      { text: "Leading people", textAr: "تقود ناس", weights: getWeights('leadership') },
      { text: "Organizing projects", textAr: "تنظم مشاريع", weights: getWeights('organization') },
      { text: "Dealing with people", textAr: "تتعامل مع ناس", weights: getWeights('communication') },
      { text: "Innovating", textAr: "تبتكر", weights: getWeights('creativity') },
      { text: "Analyzing data", textAr: "تحلل بيانات", weights: getWeights('analysis') },
      { text: "Executing tasks", textAr: "تنفذ مهام", weights: getWeights('execution') },
    ]
  },
  {
    text: "Your point of strength:",
    textAr: "نقطة قوتك:",
    active: true,
    order: 25,
    options: [
      { text: "Leadership", textAr: "القيادة", weights: getWeights('leadership') },
      { text: "Organization", textAr: "التنظيم", weights: getWeights('organization') },
      { text: "Communication", textAr: "التواصل", weights: getWeights('communication') },
      { text: "Creativity", textAr: "الإبداع", weights: getWeights('creativity') },
      { text: "Analysis", textAr: "التحليل", weights: getWeights('analysis') },
      { text: "Execution", textAr: "التنفيذ", weights: getWeights('execution') },
    ]
  },
  {
    text: "If there is an Event:",
    textAr: "لو في Event:",
    active: true,
    order: 26,
    options: [
      { text: "Lead it", textAr: "أقوده", weights: getWeights('leadership') },
      { text: "Organize it", textAr: "أنظمه", weights: getWeights('organization') },
      { text: "Deal with people", textAr: "أتعامل مع الناس", weights: getWeights('communication') },
      { text: "Make the ideas", textAr: "أعمل الأفكار", weights: getWeights('creativity') },
      { text: "Study the results", textAr: "أدرس النتائج", weights: getWeights('analysis') },
      { text: "Execute", textAr: "أنفذ", weights: getWeights('execution') },
    ]
  },
  {
    text: "You like to:",
    textAr: "تحب:",
    active: true,
    order: 27,
    options: [
      { text: "Be responsible", textAr: "تبقى مسؤول", weights: getWeights('leadership') },
      { text: "Be organized", textAr: "تبقى منظم", weights: getWeights('organization') },
      { text: "Be the face", textAr: "تبقى واجهة", weights: getWeights('communication') },
      { text: "Be creative", textAr: "تبقى مبدع", weights: getWeights('creativity') },
      { text: "Be an analyst", textAr: "تبقى محلل", weights: getWeights('analysis') },
      { text: "Be a worker", textAr: "تبقى شغال", weights: getWeights('execution') },
    ]
  },
  {
    text: "You succeed more in:",
    textAr: "أنت بتنجح أكتر في:",
    active: true,
    order: 28,
    options: [
      { text: "Leadership", textAr: "القيادة", weights: getWeights('leadership') },
      { text: "Organization", textAr: "التنظيم", weights: getWeights('organization') },
      { text: "Relationships", textAr: "العلاقات", weights: getWeights('communication') },
      { text: "Creativity", textAr: "الإبداع", weights: getWeights('creativity') },
      { text: "Thinking", textAr: "التفكير", weights: getWeights('analysis') },
      { text: "Execution", textAr: "التنفيذ", weights: getWeights('execution') },
    ]
  },
  {
    text: "You prefer to:",
    textAr: "بتفضل:",
    active: true,
    order: 29,
    options: [
      { text: "Control", textAr: "تتحكم", weights: getWeights('leadership') },
      { text: "Arrange", textAr: "ترتب", weights: getWeights('organization') },
      { text: "Communicate", textAr: "تتواصل", weights: getWeights('communication') },
      { text: "Innovate", textAr: "تبتكر", weights: getWeights('creativity') },
      { text: "Analyze", textAr: "تحلل", weights: getWeights('analysis') },
      { text: "Execute", textAr: "تنفذ", weights: getWeights('execution') },
    ]
  },
  {
    text: "In the end, you are:",
    textAr: "في الآخر، أنت:",
    active: true,
    order: 30,
    options: [
      { text: "A leader", textAr: "قائد", weights: getWeights('leadership') },
      { text: "An organizer", textAr: "منظم", weights: getWeights('organization') },
      { text: "A speaker", textAr: "متحدث", weights: getWeights('communication') },
      { text: "Creative", textAr: "مبدع", weights: getWeights('creativity') },
      { text: "An analyst", textAr: "محلل", weights: getWeights('analysis') },
      { text: "An executor", textAr: "منفذ", weights: getWeights('execution') },
    ]
  }
];

export default function TestPage() {
  const { user, profile } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Redirect to profile if any required field is missing
    const isProfileComplete = profile && 
      profile.name && 
      profile.phone && 
      profile.department && 
      profile.bio && 
      profile.country && 
      profile.photoURL;

    if (profile && !isProfileComplete) {
      toast.error(language === 'ar' ? 'يرجى إكمال ملفك الشخصي أولاً' : 'Please complete your profile first');
      navigate('/profile');
      return;
    }

    if (profile?.completedTest) {
      navigate('/');
      return;
    }

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
        let fetchedQuestions = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Question))
          .filter(q => q.active);
        
        // Only admins should handle seeding/updating
        const isAdminUser = profile?.role === 'admin';
        const needsReseed = isAdminUser && (fetchedQuestions.length < 30 || fetchedQuestions.some(q => !q.textAr));
        
        if (needsReseed) {
          console.log("Admin detected: Seeding/Updating questions...");
          for (const seedQ of SEED_QUESTIONS) {
            const existing = fetchedQuestions.find(q => q.order === seedQ.order);
            if (!existing) {
              try {
                await addDoc(collection(db, 'questions'), seedQ);
              } catch (error) {
                handleFirestoreError(error, OperationType.CREATE, 'questions');
                return;
              }
            } else if (!existing.textAr) {
              // Update existing with Arabic text if missing
              try {
                await updateDoc(doc(db, 'questions', existing.id), {
                  textAr: seedQ.textAr,
                  options: seedQ.options
                });
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, `questions/${existing.id}`);
                return;
              }
            }
          }
          // Re-fetch after seeding
          let updatedSnapshot;
          try {
            updatedSnapshot = await getDocs(q);
          } catch (error) {
            handleFirestoreError(error, OperationType.LIST, 'questions');
            return;
          }
          fetchedQuestions = updatedSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Question))
            .filter(q => q.active);
        }
        
        setQuestions(fetchedQuestions);
      } catch (error) {
        console.error("Error fetching questions:", error);
        toast.error("Failed to load questions. Please contact an admin.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [profile, navigate]);

  const handleSelect = (optionIndex: number) => {
    if (!questions[currentIndex]) return;
    setAnswers({ ...answers, [questions[currentIndex].id]: optionIndex });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      toast.error("Please answer all questions before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const totals: DimensionWeights = {
        leadership: 0,
        organization: 0,
        communication: 0,
        creativity: 0,
        analysis: 0,
        execution: 0
      };

      // Save responses and calculate totals
      for (const qId in answers) {
        const question = questions.find(q => q.id === qId);
        const optionIndex = answers[qId];
        const weights = question?.options[optionIndex].weights;

        if (weights) {
          Object.keys(weights).forEach(key => {
            const k = key as keyof DimensionWeights;
            totals[k] += weights[k];
          });
        }

        try {
          await addDoc(collection(db, 'responses'), {
            userId: user?.uid,
            questionId: qId,
            selectedOptionIndex: optionIndex,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'responses');
          return;
        }
      }

      // Determine primary and secondary traits
      const sortedTraits = Object.entries(totals)
        .sort(([, a], [, b]) => b - a)
        .map(([trait]) => trait as keyof DimensionWeights);

      const primaryTrait = sortedTraits[0];
      const secondaryTrait = sortedTraits[1];

      // Save score
      try {
        await setDoc(doc(db, 'scores', user!.uid), {
          userId: user?.uid,
          ...totals,
          primaryTrait,
          secondaryTrait,
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `scores/${user!.uid}`);
        return;
      }

      // Mark user as completed
      try {
        await updateDoc(doc(db, 'users', user!.uid), {
          completedTest: true
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user!.uid}`);
        return;
      }

      toast.success("Test submitted successfully!");
      navigate('/');
    } catch (error) {
      console.error("Error submitting test:", error);
      toast.error("Failed to submit test");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading your test...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <div className="w-16 h-16 text-slate-200 mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Questions Available</h3>
        <p className="text-slate-500 mb-6">The test is currently being prepared. Please check back later.</p>
        <button onClick={() => navigate('/')} className="text-indigo-600 font-bold hover:underline">Return Home</button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-end mb-2">
          <div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{t('test.question')} {currentIndex + 1} of {questions.length}</span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{t('test.title')}</h2>
          </div>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-indigo-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors"
        >
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex-1">
              {language === 'ar' && currentQuestion.textAr ? currentQuestion.textAr : currentQuestion.text}
            </h3>
          </div>
          
          <div className="space-y-4">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                className={`w-full text-left p-5 rounded-xl border-2 transition-all flex items-center justify-between group ${
                  answers[currentQuestion.id] === idx 
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" 
                    : "border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <span className={`font-medium ${answers[currentQuestion.id] === idx ? "text-indigo-900 dark:text-indigo-200" : "text-slate-700 dark:text-slate-300"}`}>
                  {language === 'ar' && option.textAr ? option.textAr : option.text}
                </span>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  answers[currentQuestion.id] === idx 
                    ? "border-indigo-600 bg-indigo-600 text-white" 
                    : "border-slate-200 dark:border-slate-700 group-hover:border-indigo-300"
                }`}>
                  {answers[currentQuestion.id] === idx && <CheckCircle2 className="w-4 h-4" />}
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={handleBack}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          {t('test.back')}
        </button>

        {currentIndex === questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={submitting || answers[currentQuestion.id] === undefined}
            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 transition-all"
          >
            {submitting ? t('test.submitting') : t('test.finish')}
            {!submitting && <Send className="w-4 h-4" />}
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={answers[currentQuestion.id] === undefined}
            className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 transition-all"
          >
            {t('test.next')}
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
