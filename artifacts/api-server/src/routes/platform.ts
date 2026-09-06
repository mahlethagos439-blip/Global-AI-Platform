import { Router, type IRouter } from "express";
import {
  CreateConversationBody,
  CreateConversationResponse,
  CreateProjectBody,
  CreateProjectResponse,
  DeleteMemoryParams,
  GetConversationParams,
  GetConversationResponse,
  GetDashboardResponse,
  GetPreferencesResponse,
  ListAgentsResponse,
  ListConversationsResponse,
  ListIntegrationCapabilitiesResponse,
  ListMemoryResponse,
  ListPlansResponse,
  ListProjectsResponse,
  SendMessageBody,
  SendMessageParams,
  SendMessageResponse,
  UpdateMemoryBody,
  UpdateMemoryParams,
  UpdateMemoryResponse,
  UpdatePreferencesBody,
  UpdatePreferencesResponse,
} from "@workspace/api-zod";

type Agent = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: string;
  accent: string;
  recommended: boolean;
};

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  confidence: "high" | "medium" | "low";
  citations?: string[];
};

type Conversation = {
  id: string;
  title: string;
  preview: string;
  agentId: string;
  updatedAt: string;
  messageCount: number;
};

const agentSeed: Array<[string, string, string, string, string, string, boolean]> = [
  ["study", "Study", "Learning companion", "Build understanding, practice, and recall.", "Learning", "violet", true],
  ["research", "Research", "Evidence finder", "Explore questions, compare sources, and surface uncertainty.", "Research", "blue", true],
  ["writing", "Writing", "Writing partner", "Draft, edit, structure, and sharpen your voice.", "Writing", "amber", false],
  ["language", "Language", "Language bridge", "Translate and communicate across languages and cultures.", "Language", "teal", false],
  ["productivity", "Productivity", "Focus planner", "Turn a busy day into clear next actions.", "Productivity", "indigo", false],
  ["goals", "Goals", "Progress coach", "Make meaningful goals measurable and actionable.", "Goal achievement", "green", false],
  ["career", "Career", "Career navigator", "Clarify direction, prepare, and make your next move.", "Career", "pink", false],
  ["business", "Business", "Business strategist", "Turn ideas into experiments, decisions, and momentum.", "Entrepreneurship", "orange", false],
  ["operations", "Operations", "Operations guide", "Document and improve the way work gets done.", "Business operations", "cyan", false],
  ["data", "Data", "Data analyst", "Find signal in spreadsheets, documents, and messy information.", "Data & documents", "sky", false],
  ["automation", "Automation", "Workflow builder", "Design reliable workflows with permission checkpoints.", "Automation", "purple", false],
  ["decision", "Decision", "Decision partner", "Make tradeoffs visible and choose with confidence.", "Decision support", "red", false],
  ["creativity", "Creativity", "Creative studio", "Generate directions, concepts, and expressive work.", "Creativity", "fuchsia", false],
  ["assistant", "Assistant", "Personal assistant", "Keep context, organize life, and help things move.", "Personal AI assistant", "slate", false],
  ["universal", "Universal Solver", "Problem solver", "Coordinate the right approach for complex problems.", "Universal problem solver", "gold", true],
];

const agents: Agent[] = agentSeed.map(([id, name, shortName, description, category, accent, recommended]) => ({
  id,
  name,
  shortName,
  description,
  category,
  accent,
  recommended,
}));

const now = () => new Date().toISOString();

const conversations: Conversation[] = [
  {
    id: "conv-1",
    title: "Plan my transition into product",
    preview: "A grounded path from research to your first portfolio project.",
    agentId: "career",
    updatedAt: "Today",
    messageCount: 8,
  },
  {
    id: "conv-2",
    title: "Understand renewable energy storage",
    preview: "Comparing the technologies, tradeoffs, and open questions.",
    agentId: "research",
    updatedAt: "Yesterday",
    messageCount: 12,
  },
  {
    id: "conv-3",
    title: "Build a weekly learning rhythm",
    preview: "A lighter system that makes progress visible.",
    agentId: "study",
    updatedAt: "3 days ago",
    messageCount: 5,
  },
];

const messages = new Map<string, Message[]>([
  [
    "conv-1",
    [
      {
        id: "msg-1",
        role: "assistant",
        content:
          "I can help you move from a broad career goal to a clear experiment. What part feels most uncertain right now?",
        createdAt: now(),
        confidence: "high",
      },
    ],
  ],
]);

const projects = [
  {
    id: "project-1",
    name: "Product launch foundation",
    description: "Move the company vision from product principle to first customer signal.",
    progress: 42,
    status: "active" as const,
    updatedAt: "Updated today",
    agentIds: ["universal", "business", "research"],
  },
  {
    id: "project-2",
    name: "Amharic learning path",
    description: "A practical, gentle system for building confidence in everyday conversation.",
    progress: 24,
    status: "active" as const,
    updatedAt: "Updated yesterday",
    agentIds: ["language", "study", "goals"],
  },
];

const memory = [
  {
    id: "memory-1",
    label: "Preferred working style",
    value: "You like clear frameworks, direct language, and a visible next step.",
    source: "From your conversations",
    enabled: true,
    updatedAt: "Updated 2 days ago",
  },
  {
    id: "memory-2",
    label: "Current focus",
    value: "Build the first B2C version of an international AI company.",
    source: "You told me",
    enabled: true,
    updatedAt: "Updated today",
  },
  {
    id: "memory-3",
    label: "Use memory for personalization",
    value: "Allow the assistant to use approved memories when planning and answering.",
    source: "Privacy control",
    enabled: true,
    updatedAt: "Updated today",
  },
];

const preferences = {
  language: "English",
  region: "Ethiopia",
  timezone: "Africa/Addis_Ababa",
  dateFormat: "DD/MM/YYYY",
  unitSystem: "metric" as const,
};

const plans = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "A thoughtful place to start solving everyday problems.",
    features: ["Core AI chat", "3 personal projects", "Conversation history", "Memory controls"],
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 9.99,
    annualPrice: 99.9,
    description: "More depth, context, and room for ambitious personal work.",
    features: ["Everything in Free", "Unlimited projects", "Longer context", "Advanced agents", "Voice and document tools"],
    highlighted: true,
  },
  {
    id: "premium",
    name: "Premium",
    monthlyPrice: 24.99,
    annualPrice: 249.9,
    description: "A fuller personal operating system for complex goals.",
    features: ["Everything in Pro", "Priority reasoning", "Research with citations", "Multimodal analysis", "Outcome tracking"],
    highlighted: false,
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: 79.99,
    annualPrice: 799.9,
    description: "A future-ready foundation for teams and company assistants.",
    features: ["Everything in Premium", "Team workspaces", "Permissions and audit logs", "Company knowledge", "Business integrations"],
    highlighted: false,
  },
];

function inferAgent(content: string) {
  const normalized = content.toLowerCase();
  if (normalized.includes("translate") || normalized.includes("language")) return agents.find((agent) => agent.id === "language")!;
  if (normalized.includes("study") || normalized.includes("learn")) return agents.find((agent) => agent.id === "study")!;
  if (normalized.includes("write") || normalized.includes("draft")) return agents.find((agent) => agent.id === "writing")!;
  if (normalized.includes("research") || normalized.includes("compare")) return agents.find((agent) => agent.id === "research")!;
  if (normalized.includes("career") || normalized.includes("job")) return agents.find((agent) => agent.id === "career")!;
  if (normalized.includes("business") || normalized.includes("company")) return agents.find((agent) => agent.id === "business")!;
  return agents.find((agent) => agent.id === "universal")!;
}

const router: IRouter = Router();

router.get("/dashboard", (_req, res) => {
  res.json(
    GetDashboardResponse.parse({
      greeting: "Good morning, Mahlet",
      activeProjects: projects.length,
      conversationsThisWeek: 12,
      outcomeProgress: 68,
      recentActivity: [
        { id: "activity-1", label: "Project checkpoint", detail: "Product launch foundation moved to 42%", timestamp: "2h ago", tone: "violet" },
        { id: "activity-2", label: "Conversation saved", detail: "Your career transition plan is ready to revisit", timestamp: "Yesterday", tone: "teal" },
        { id: "activity-3", label: "Memory updated", detail: "Added your preference for clear next steps", timestamp: "2d ago", tone: "amber" },
      ],
    }),
  );
});

router.get("/agents", (_req, res) => res.json(ListAgentsResponse.parse(agents)));

router.get("/integrations/catalog", (_req, res) =>
  res.json(
    ListIntegrationCapabilitiesResponse.parse([
      { id: "web-research", name: "Web research", description: "Citations and source-aware research", status: "planned", icon: "globe" },
      { id: "email", name: "Email", description: "Read, draft, and send with permission", status: "planned", icon: "mail" },
      { id: "calendar", name: "Calendar", description: "Plan time and coordinate events", status: "planned", icon: "calendar" },
      { id: "cloud-files", name: "Cloud files", description: "Work with documents and folders", status: "planned", icon: "folder" },
      { id: "spreadsheets", name: "Spreadsheets", description: "Analyze and update structured data", status: "planned", icon: "table" },
    ]),
  ),
);

router.get("/conversations", (_req, res) => res.json(ListConversationsResponse.parse(conversations)));

router.post("/conversations", (req, res) => {
  const input = CreateConversationBody.parse(req.body);
  const conversation = {
    id: `conv-${Date.now()}`,
    title: input.title,
    preview: "A new problem space, ready to explore.",
    agentId: input.agentId,
    updatedAt: "Just now",
    messageCount: 0,
  };
  conversations.unshift(conversation);
  messages.set(conversation.id, []);
  res.status(201).json(CreateConversationResponse.parse(conversation));
});

router.get("/conversations/:conversationId", (req, res) => {
  const { conversationId } = GetConversationParams.parse(req.params);
  const conversation = conversations.find((item) => item.id === conversationId);
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });
  return res.json(
    GetConversationResponse.parse({
      conversation,
      messages: messages.get(conversationId) ?? [],
    }),
  );
});

router.post("/conversations/:conversationId/messages", (req, res) => {
  const { conversationId } = SendMessageParams.parse(req.params);
  const input = SendMessageBody.parse(req.body);
  const conversation = conversations.find((item) => item.id === conversationId);
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });

  const agent = inferAgent(input.content);
  const userMessage: Message = {
    id: `msg-${Date.now()}`,
    role: "user",
    content: input.content,
    createdAt: now(),
    confidence: "high",
  };
  const assistantMessage: Message = {
    id: `msg-${Date.now()}-assistant`,
    role: "assistant",
    content: `I’m routing this through ${agent.name}. The live model connection is not enabled yet, so this is an honest orchestration preview. The next step would be to clarify the outcome you want, choose the right tools, and then turn it into an actionable plan.`,
    createdAt: now(),
    confidence: "medium",
    citations: [],
  };
  const thread = messages.get(conversationId) ?? [];
  thread.push(userMessage, assistantMessage);
  messages.set(conversationId, thread);
  conversation.preview = input.content;
  conversation.updatedAt = "Just now";
  conversation.messageCount = thread.length;
  return res.json(
    SendMessageResponse.parse({
      userMessage,
      assistantMessage,
      route: {
        agentId: agent.id,
        agentName: agent.name,
        model: "Orchestrator preview",
        reason: `Matched the request to the ${agent.category.toLowerCase()} problem area.`,
        needsPermission: false,
      },
    }),
  );
});

router.get("/projects", (_req, res) => res.json(ListProjectsResponse.parse(projects)));

router.post("/projects", (req, res) => {
  const input = CreateProjectBody.parse(req.body);
  const project = {
    id: `project-${Date.now()}`,
    name: input.name,
    description: input.description,
    progress: 0,
    status: "active" as const,
    updatedAt: "Just now",
    agentIds: ["universal"],
  };
  projects.unshift(project);
  res.status(201).json(CreateProjectResponse.parse(project));
});

router.get("/memory", (_req, res) => res.json(ListMemoryResponse.parse(memory)));

router.patch("/memory/:memoryId", (req, res) => {
  const { memoryId } = UpdateMemoryParams.parse(req.params);
  const input = UpdateMemoryBody.parse(req.body);
  const item = memory.find((entry) => entry.id === memoryId);
  if (!item) return res.status(404).json({ error: "Memory not found" });
  Object.assign(item, input, { updatedAt: "Just now" });
  return res.json(UpdateMemoryResponse.parse(item));
});

router.delete("/memory/:memoryId", (req, res) => {
  const { memoryId } = DeleteMemoryParams.parse(req.params);
  const index = memory.findIndex((entry) => entry.id === memoryId);
  if (index === -1) return res.status(404).json({ error: "Memory not found" });
  memory.splice(index, 1);
  return res.status(204).send();
});

router.get("/preferences", (_req, res) => res.json(GetPreferencesResponse.parse(preferences)));

router.patch("/preferences", (req, res) => {
  const input = UpdatePreferencesBody.parse(req.body);
  Object.assign(preferences, input);
  return res.json(UpdatePreferencesResponse.parse(preferences));
});

router.get("/plans", (_req, res) => res.json(ListPlansResponse.parse(plans)));

export default router;