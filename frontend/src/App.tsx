import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import {
  Bookmark,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  HelpCircle,
  History,
  LoaderCircle,
  Map,
  MessageSquare,
  Paperclip,
  PlusSquare,
  RotateCcw,
  Search,
  SendHorizontal,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UserRound,
  Wrench,
  X,
} from 'lucide-react';
import './App.css';

type ViewMode = 'chat' | 'recent' | 'faq' | 'help';

const BRAND_SHORT = '清巡';
const BRAND_NAME = `${BRAND_SHORT}助手`;
const SERVICE_NAME = `${BRAND_SHORT} AI 客服`;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  toolActivity?: {
    id: string;
    name: string;
    status: 'running' | 'completed';
    startedAt: number;
  };
}

interface ConversationSession {
  id: string;
  title: string;
  updatedAt: string;
  summary: string;
  tag: string;
  messages: Message[];
}

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const createInitialMessages = (): Message[] => [
  {
    id: crypto.randomUUID(),
    role: 'assistant',
    content:
      `您好，我是${BRAND_SHORT}智能助手，可以帮助您处理扫地机器人选购、使用、故障排查、耗材更换和售后问题。`,
  },
];

const quickReplies = [
  { icon: RotateCcw, label: '机器人无法自动回充' },
  { icon: Wrench, label: '吸力变弱怎么处理' },
  { icon: ShoppingCart, label: '帮我选购扫拖一体机' },
];

const faqItems: FaqItem[] = [
  {
    id: 'faq-1',
    category: '回充问题',
    question: '机器人为什么找不到充电座？',
    answer:
      '充电座周围空间不足、底座被移动、地图失效或充电触点脏污，都会导致回充失败。先固定底座位置并清洁触点，再重新建图通常能解决。',
  },
  {
    id: 'faq-2',
    category: '清洁效果',
    question: '吸力变弱后需要先换耗材吗？',
    answer:
      '不一定。优先检查尘盒、滤网、主刷、边刷和吸入口是否堵塞。确认清洁后仍无改善，再根据使用时长判断是否需要更换滤网或主刷。',
  },
  {
    id: 'faq-3',
    category: '选购建议',
    question: '大户型应该关注哪些能力？',
    answer:
      '大户型建议重点看续航、自动集尘、基站补水、建图稳定性和跨房间调度能力。面积越大，基站自动化能力越能减少日常维护成本。',
  },
  {
    id: 'faq-4',
    category: '耗材更换',
    question: '滤网和边刷多久更换一次？',
    answer:
      '一般建议 1 到 3 个月检查一次滤网、边刷和主刷磨损情况。宠物家庭或高频使用场景，耗材更换周期通常会更短。',
  },
  {
    id: 'faq-5',
    category: '拖地功能',
    question: '拖地后地面有水痕怎么办？',
    answer:
      '可以先降低出水量，确认拖布是否过脏或未甩干，同时避免在木地板或高反光地砖上使用过高出水档位。必要时更换拖布并校准清洁模式。',
  },
  {
    id: 'faq-6',
    category: '售后支持',
    question: '出现异响时应该怎么判断是否需要送修？',
    answer:
      '先排除主刷缠绕、边刷松动和万向轮卡顿等常见问题。如果清洁后仍有持续异响，尤其伴随吸力异常或驱动报错，建议联系售后检修。',
  },
];

const helpCards = [
  {
    title: '服务时间',
    description: '查看人工客服在线时段',
    action: '查看人工客服时段',
    icon: CalendarClock,
    tone: 'blue',
  },
  {
    title: '保修提示',
    description: '查询设备保修状态及政策',
    action: '查看保修政策',
    icon: ShieldCheck,
    tone: 'green',
  },
  {
    title: '自助排查',
    description: '常见故障现象及解决方法',
    action: '查看自助排障清单',
    icon: Search,
    tone: 'violet',
  },
];

const helpConsumables = [
  { label: '滤芯（建议更换）', status: 'warning' },
  { label: '边刷（状态良好）', status: 'healthy' },
];

const mapGuideSteps = [
  '确保基站位置未被移动，且前方有足够的空旷区域以便设备识别信号。',
  '检查设备顶部的激光雷达传感器是否有灰尘遮挡，可用干净的软布轻轻擦拭。',
  '如地图出现严重错乱，建议在 App 中删除当前地图，重新启动设备进行全屋建图。',
];

function cloneMessages(messages: Message[]): Message[] {
  return messages.map((message) => ({
    ...message,
    id: crypto.randomUUID(),
    isStreaming: false,
  }));
}

function AssistantAvatar() {
  return (
    <div className="assistant-avatar">
      <Sparkles size={18} strokeWidth={2.2} />
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <span className="empty-state__icon">
        <Icon size={26} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && onAction && (
        <button type="button" className="solid-action" onClick={onAction}>
          {action}
        </button>
      )}
    </motion.div>
  );
}

function ToolActivity({
  activity,
}: {
  activity: NonNullable<Message['toolActivity']>;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const updateElapsed = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - activity.startedAt) / 1000)));
    };
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 500);
    return () => window.clearInterval(timer);
  }, [activity.startedAt]);

  const labels: Record<string, string> = {
    search_knowledge: '知识库检索',
    get_weather: '天气查询',
    get_current_user_id: '用户身份读取',
    get_current_month: '当前月份读取',
    fetch_usage_record: '设备使用记录查询',
  };
  const label = labels[activity.name] ?? '外部工具';
  const isRunning = activity.status === 'running';

  return (
    <div className="tool-state" aria-live="polite">
      <span className={`tool-state__icon ${!isRunning ? 'tool-state__icon--completed' : ''}`}>
        {isRunning ? <LoaderCircle size={20} /> : <CheckCircle2 size={20} />}
        {!isRunning && <span className="tool-state__orbit" />}
      </span>
      <span className="tool-state__content">
        <span className="tool-state__head">
          <span className="tool-state__eyebrow">
            {isRunning ? '正在调用工具' : '工具调用完成'}
          </span>
          <span className="tool-state__elapsed">已处理 {elapsedSeconds} 秒</span>
        </span>
        <span className="tool-state__label">
          {isRunning ? `正在调用${label}` : `${label}完成，正在生成答案`}
        </span>
        <span className="tool-state__progress" aria-hidden="true">
          <span className="tool-state__progress-bar" />
        </span>
        <span className="tool-state__steps" aria-hidden="true">
          <span className={isRunning ? 'is-active' : 'is-done'}>分析问题</span>
          <span className={isRunning ? 'is-active' : 'is-done'}>检索资料</span>
          <span className={!isRunning ? 'is-active' : ''}>生成答案</span>
        </span>
      </span>
    </div>
  );
}

function ChatMessages({ messages }: { messages: Message[] }) {
  return (
    <>
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={message.role === 'user' ? 'message-row message-row--user' : 'message-row'}
          >
            {message.role === 'assistant' && <AssistantAvatar />}
            {message.role === 'assistant' ? (
              <div className="assistant-stack">
                <div
                  className={`message-bubble message-bubble--assistant ${
                    message.isStreaming && !message.content.trim()
                      ? 'message-bubble--thinking'
                      : ''
                  }`}
                >
                  {message.isStreaming && !message.content.trim() ? (
                    message.toolActivity ? (
                      <ToolActivity activity={message.toolActivity} />
                    ) : (
                      <div className="thinking-state" aria-label="正在理解问题">
                        <span className="thinking-state__label">正在理解问题</span>
                        <span className="thinking-state__dots">
                          <span className="thinking-state__dot" />
                          <span className="thinking-state__dot" />
                          <span className="thinking-state__dot" />
                        </span>
                      </div>
                    )
                  ) : (
                    <>
                      <div className="assistant-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                      {message.isStreaming && <span className="message-cursor" />}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="message-bubble message-bubble--user">{message.content}</div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState<ViewMode>('chat');
  const [messages, setMessages] = useState<Message[]>(createInitialMessages());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string>(() => crypto.randomUUID());
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [faqCategory, setFaqCategory] = useState<string>('全部');
  const [faqQuery, setFaqQuery] = useState('');
  const [sessionQuery, setSessionQuery] = useState('');
  const [notice, setNotice] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeView !== 'chat') return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, activeView]);

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const response = await fetch('/api/conversations', {
          headers: { 'X-User-ID': '1001' },
        });
        if (!response.ok) return;

        const conversations: Array<{
          id: string;
          title: string;
          updated_at: string;
        }> = await response.json();
        if (!conversations.length) return;

        const persistedSessions = await Promise.all(
          conversations.map(async (conversation) => {
            const messagesResponse = await fetch(
              `/api/conversations/${conversation.id}/messages`,
            );
            const storedMessages: Array<Message & { created_at: string }> =
              messagesResponse.ok ? await messagesResponse.json() : [];
            const assistantSummary =
              [...storedMessages]
                .reverse()
                .find((message) => message.role === 'assistant')
                ?.content.slice(0, 80) ?? '已保存的客服会话';

            return {
              id: conversation.id,
              title: conversation.title,
              updatedAt: new Date(conversation.updated_at).toLocaleString('zh-CN'),
              summary: assistantSummary,
              tag: '历史会话',
              messages: cloneMessages(storedMessages),
            };
          }),
        );

        setSessions(persistedSessions);
        setSelectedSessionId(persistedSessions[0].id);
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    };

    void loadConversations();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
  }, [input]);

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? sessions[0] ?? null;
  const visibleSessions = sessions.filter((session) => {
    const query = sessionQuery.trim().toLowerCase();
    if (!query) return true;
    return `${session.title} ${session.summary}`.toLowerCase().includes(query);
  });

  const faqCategories = ['全部', ...new Set(faqItems.map((item) => item.category))];
  const filteredFaqs =
    (faqCategory === '全部'
      ? faqItems
      : faqItems.filter((item) => item.category === faqCategory)
    ).filter((item) => {
      const query = faqQuery.trim().toLowerCase();
      if (!query) return true;
      return `${item.question} ${item.answer} ${item.category}`.toLowerCase().includes(query);
    });

  const sendPrompt = async (prompt: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
    };
    const assistantMessageId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantMessageId, role: 'assistant', content: '', isStreaming: true },
    ]);
    setInput('');
    setIsLoading(true);
    setActiveView('chat');
    let assistantContent = '';

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': '1001',
        },
        body: JSON.stringify({
          threadId,
          runId: crypto.randomUUID(),
          state: {},
          messages: [
            {
              id: userMessage.id,
              role: 'user',
              content: prompt,
            },
          ],
          tools: [],
          context: [],
          forwardedProps: {},
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      if (!response.body) {
        throw new Error('API returned no response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let runError: Error | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'TEXT_MESSAGE_CONTENT') {
              assistantContent += data.delta ?? '';
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantMessageId
                    ? {
                        ...message,
                        content: message.content + (data.delta ?? ''),
                        toolActivity: undefined,
                      }
                    : message,
                ),
              );
              continue;
            }

            if (data.type === 'TOOL_CALL_START') {
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantMessageId
                    ? {
                        ...message,
                        toolActivity: {
                          id: data.toolCallId,
                          name: data.toolCallName,
                          status: 'running',
                          startedAt: Date.now(),
                        },
                      }
                    : message,
                ),
              );
              continue;
            }

            if (data.type === 'TOOL_CALL_RESULT') {
              setMessages((prev) =>
                prev.map((message) => {
                  const activity = message.toolActivity;
                  if (
                    message.id !== assistantMessageId ||
                    !activity ||
                    activity.id !== data.toolCallId
                  ) {
                    return message;
                  }
                  return {
                    ...message,
                      toolActivity: {
                        id: activity.id,
                        name: activity.name,
                        status: 'completed',
                        startedAt: activity.startedAt,
                      },
                  };
                }),
              );
              continue;
            }

            if (data.type === 'RUN_ERROR') {
              runError = new Error(data.message ?? 'Agent run failed');
              continue;
            }

            if (data.type === 'TEXT_MESSAGE_END' || data.type === 'RUN_FINISHED') {
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantMessageId
                    ? { ...message, isStreaming: false }
                    : message,
                ),
              );
            }
          } catch (error) {
            console.error('Failed to parse SSE payload:', error);
          }
        }
      }
      if (runError) throw runError;
    } catch (error) {
      console.error('Chat request failed:', error);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: '抱歉，当前无法完成请求，请检查后端服务或接口配置。',
                isStreaming: false,
              }
            : message,
        ),
      );
    } finally {
      setIsLoading(false);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMessageId
            ? { ...message, isStreaming: false }
            : message,
        ),
      );

      const liveSession: ConversationSession = {
        id: threadId,
        title: prompt.length > 14 ? `${prompt.slice(0, 14)}...` : prompt,
        updatedAt: '刚刚',
        summary: assistantContent.slice(0, 80) || '当前对话',
        tag: '当前会话',
        messages: cloneMessages([
          ...messages,
          userMessage,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: assistantContent,
          },
        ]),
      };
      setSessions((prev) => [
        liveSession,
        ...prev.filter((item) => item.id !== threadId),
      ]);
      setSelectedSessionId(threadId);
    }
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const prompt = input.trim();
    if (!prompt || isLoading) return;
    await sendPrompt(prompt);
  };

  const handleNewChat = () => {
    setThreadId(crypto.randomUUID());
    setMessages(createInitialMessages());
    setInput('');
    setIsLoading(false);
    setActiveView('chat');
  };

  const restoreConversation = (session: ConversationSession) => {
    setThreadId(session.id);
    setMessages(cloneMessages(session.messages));
    setActiveView('chat');
  };

  const openPrompt = (prompt: string) => {
    setInput(prompt);
    setActiveView('chat');
    window.setTimeout(() => textareaRef.current?.focus(), 120);
  };

  const showNotice = (message: string) => setNotice(message);

  const topbarTitle =
    activeView === 'recent'
      ? '最近会话'
      : activeView === 'faq'
        ? '常用问题'
        : activeView === 'help'
          ? '帮助中心'
          : SERVICE_NAME;

  return (
    <div className="lumina-shell">
      <aside className="lumina-sidebar">
        <div className="lumina-sidebar__inner">
          <div className="lumina-brand">
            <div className="lumina-brand__title">{BRAND_NAME}</div>
            <div className="lumina-brand__status">在线智能客服</div>
          </div>

          <nav className="lumina-nav">
            <button
              type="button"
              className={`lumina-nav__item ${activeView === 'chat' ? 'lumina-nav__item--active' : ''}`}
              onClick={handleNewChat}
            >
              <PlusSquare size={20} />
              <span>新建对话</span>
            </button>
            <button
              type="button"
              className={`lumina-nav__item ${activeView === 'recent' ? 'lumina-nav__item--active' : ''}`}
              onClick={() => setActiveView('recent')}
            >
              <MessageSquare size={20} />
              <span>最近会话</span>
            </button>
            <button
              type="button"
              className={`lumina-nav__item ${activeView === 'faq' ? 'lumina-nav__item--active' : ''}`}
              onClick={() => setActiveView('faq')}
            >
              <Bookmark size={20} />
              <span>常用问题</span>
            </button>
          </nav>

          <div className="lumina-sidebar__footer">
            <button
              type="button"
              className={`lumina-nav__item ${activeView === 'help' ? 'lumina-nav__item--active' : ''}`}
              onClick={() => setActiveView('help')}
            >
              <HelpCircle size={20} />
              <span>帮助中心</span>
            </button>
            <button type="button" className="lumina-nav__item lumina-nav__item--footer">
              <Settings size={20} />
              <span>账号设置</span>
            </button>
          </div>
        </div>
      </aside>

      <section className="lumina-main">
        <header className="topbar">
          <div className="topbar__identity">
            <Sparkles size={20} strokeWidth={2.2} />
            <span>{topbarTitle}</span>
          </div>

          <div className="topbar__actions">
            <button
              type="button"
              className="topbar__human"
              onClick={() => openPrompt('我需要转接人工客服')}
            >
              <UserRound size={17} />
              转人工服务
            </button>
            <button type="button" className="topbar__icon" onClick={() => setActiveView('recent')}>
              <History size={22} />
            </button>
            <button
              type="button"
              className="topbar__icon"
              onClick={() => showNotice('账号设置功能正在接入中')}
              aria-label="账号设置"
            >
              <Settings size={22} />
            </button>
          </div>
        </header>

        <main className="chat-scroll">
          <AnimatePresence mode="wait" initial={false}>
          {activeView === 'chat' && (
            <motion.div
              key="chat"
              className="chat-column"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {messages.length === 1 && (
                <section className="welcome-card">
                  <div className="welcome-card__glow" />
                  <div className="welcome-card__content">
                    <span className="welcome-card__badge">
                      <Sparkles size={15} />
                      AI 智能服务
                    </span>
                    <h1>今天需要解决什么问题？</h1>
                    <p>描述设备现象、错误提示或使用场景，我会检索知识库并给出可执行步骤。</p>
                    <div className="welcome-card__capabilities">
                      <span><RotateCcw size={16} />故障排查</span>
                      <span><ShoppingCart size={16} />产品选购</span>
                      <span><Wrench size={16} />维护保养</span>
                    </div>
                  </div>
                  <div className="welcome-card__visual">
                    <span className="welcome-orbit welcome-orbit--one" />
                    <span className="welcome-orbit welcome-orbit--two" />
                    <Sparkles size={40} />
                  </div>
                </section>
              )}
              <ChatMessages messages={messages} />
              <div ref={messagesEndRef} />
            </motion.div>
          )}

          {activeView === 'recent' && (
            <motion.div
              key="recent"
              className="module-page module-page--recent"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
            >
              <section className="panel recent-list">
                <div className="panel__header">
                  <div className="panel__title-row">
                    <h2>最近会话</h2>
                    <span className="panel__count">{sessions.length}</span>
                  </div>
                  <p>查看近期咨询记录，并可一键恢复到对话窗口继续追问。</p>
                </div>

                <label className="module-search">
                  <Search size={17} />
                  <input
                    value={sessionQuery}
                    onChange={(event) => setSessionQuery(event.target.value)}
                    placeholder="搜索会话"
                  />
                  {sessionQuery && (
                    <button type="button" onClick={() => setSessionQuery('')} aria-label="清空搜索">
                      <X size={15} />
                    </button>
                  )}
                </label>

                <div className="recent-list__items">
                  {visibleSessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      className={`recent-card ${selectedSessionId === session.id ? 'recent-card--active' : ''}`}
                      onClick={() => setSelectedSessionId(session.id)}
                    >
                      <div className="recent-card__head">
                        <span className="recent-card__tag">{session.tag}</span>
                        <span className="recent-card__time">{session.updatedAt}</span>
                      </div>
                      <div className="recent-card__title">{session.title}</div>
                      <div className="recent-card__summary">{session.summary}</div>
                    </button>
                  ))}
                  {!visibleSessions.length && (
                    <EmptyState
                      icon={MessageSquare}
                      title={sessions.length ? '没有匹配的会话' : '暂无历史会话'}
                      description={sessions.length ? '换个关键词试试。' : '完成一次咨询后，会话会自动保存到这里。'}
                      action={!sessions.length ? '开始新对话' : undefined}
                      onAction={!sessions.length ? handleNewChat : undefined}
                    />
                  )}
                </div>
              </section>

              {selectedSession ? (
                <motion.section
                  key={selectedSession.id}
                  className="panel recent-preview"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="recent-preview__toolbar">
                    <div className="recent-preview__identity">
                      <span className="recent-preview__eyebrow">
                        <History size={14} />
                        会话预览
                      </span>
                      <h2>{selectedSession.title}</h2>
                      <div className="recent-preview__meta">
                        <span>{selectedSession.messages.length} 条消息</span>
                        <span>{selectedSession.updatedAt}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="solid-action recent-preview__restore"
                      onClick={() => restoreConversation(selectedSession)}
                    >
                      <MessageSquare size={17} />
                      恢复对话
                    </button>
                  </div>

                  <div className="recent-preview__messages">
                    <ChatMessages messages={selectedSession.messages} />
                  </div>

                  <div className="recent-preview__mobile-action">
                    <button
                      type="button"
                      className="solid-action recent-preview__restore"
                      onClick={() => restoreConversation(selectedSession)}
                    >
                      <MessageSquare size={17} />
                      恢复并继续对话
                    </button>
                  </div>
                </motion.section>
              ) : (
                <section className="panel recent-preview">
                  <EmptyState
                    icon={History}
                    title="选择一条会话"
                    description="会话内容会显示在这里，您可以随时恢复继续咨询。"
                  />
                </section>
              )}
            </motion.div>
          )}

          {activeView === 'faq' && (
            <motion.div
              key="faq"
              className="module-page"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
            >
              <section className="panel faq-overview">
                <div className="panel__header">
                  <div className="panel__title-row">
                    <h2>常用问题</h2>
                    <span className="panel__count">{filteredFaqs.length}</span>
                  </div>
                  <p>把高频咨询按场景分类，支持直接带入聊天继续问。</p>
                </div>

                <label className="module-search module-search--wide">
                  <Search size={18} />
                  <input
                    value={faqQuery}
                    onChange={(event) => setFaqQuery(event.target.value)}
                    placeholder="搜索故障、耗材、回充或选购问题"
                  />
                  {faqQuery && (
                    <button type="button" onClick={() => setFaqQuery('')} aria-label="清空搜索">
                      <X size={15} />
                    </button>
                  )}
                </label>

                <div className="faq-filters">
                  {faqCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`faq-filter ${faqCategory === category ? 'faq-filter--active' : ''}`}
                      onClick={() => setFaqCategory(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <motion.div layout className="faq-grid">
                  {filteredFaqs.map((item) => (
                    <motion.article
                      layout
                      key={item.id}
                      className="faq-card"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="faq-card__meta">{item.category}</div>
                      <h3>{item.question}</h3>
                      <p>{item.answer}</p>
                      <button
                        type="button"
                        className="ghost-action"
                        onClick={() => openPrompt(item.question)}
                      >
                        继续咨询这个问题
                      </button>
                    </motion.article>
                  ))}
                </motion.div>
                {!filteredFaqs.length && (
                  <EmptyState
                    icon={Search}
                    title="没有找到相关问题"
                    description="可以清空搜索，或直接在聊天中描述您的具体情况。"
                    action="转到聊天咨询"
                    onAction={() => openPrompt(faqQuery)}
                  />
                )}
              </section>
            </motion.div>
          )}

          {activeView === 'help' && (
            <motion.div
              key="help"
              className="module-page"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
            >
              <section className="panel help-hero">
                <div className="panel__header">
                  <h2>帮助中心</h2>
                  <p>围绕售后、保养、报修和自助排障整理了常用操作入口。</p>
                </div>

                <div className="help-grid">
                  <div className="help-shortcuts">
                    {helpCards.map((card) => {
                      const Icon = card.icon;
                      return (
                        <button
                          key={card.title}
                          type="button"
                          className={`help-shortcut help-shortcut--${card.tone}`}
                          onClick={() => openPrompt(card.action)}
                        >
                          <div className="help-shortcut__icon">
                            <Icon size={20} />
                          </div>
                          <div className="help-shortcut__body">
                            <strong>{card.title}</strong>
                            <span>{card.description}</span>
                          </div>
                          <ChevronRight size={18} className="help-shortcut__arrow" />
                        </button>
                      );
                    })}
                  </div>

                  <div className="help-service-grid">
                    <article className="help-feature-card">
                      <div className="help-feature-card__title">
                        <Sparkles size={20} />
                        <h3>售后处理流程</h3>
                      </div>
                      <p>
                        如果您的设备遇到无法通过自助排查解决的硬件故障或异常表现，请详细描述故障现象。我们将为您生成维修工单，并指派专业技术人员跟进处理。
                      </p>
                      <ul className="help-checklist">
                        <li>准备好设备序列号（SN）</li>
                        <li>提供故障发生时的照片或视频</li>
                      </ul>
                      <button
                        type="button"
                        className="solid-action help-feature-card__cta"
                        onClick={() => openPrompt('我要提交故障描述')}
                      >
                        我要提交故障描述
                      </button>
                    </article>

                    <article className="help-feature-card">
                      <div className="help-feature-card__title">
                        <Wrench size={20} />
                        <h3>耗材维护提醒</h3>
                      </div>
                      <p>
                        定期更换耗材是保证设备稳定运行和延长使用寿命的关键。系统会根据您的设备运行情况智能推算耗材寿命。
                      </p>
                      <div className="consumable-row">
                        {helpConsumables.map((item) => (
                          <div key={item.label} className="consumable-chip">
                            <span className={`consumable-chip__dot consumable-chip__dot--${item.status}`} />
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="ghost-action help-feature-card__outline"
                        onClick={() => openPrompt('查看耗材更换建议')}
                      >
                        查看耗材更换建议
                      </button>
                    </article>
                  </div>

                  <article className="help-guide-card">
                    <div className="help-guide-card__content">
                      <div className="help-feature-card__title">
                        <Map size={20} />
                        <h3>地图与回充指导</h3>
                      </div>
                      <p>
                        遇到设备迷失方向、无法返回基站或地图重叠等问题时，请优先检查以下几点：
                      </p>
                      <ol className="help-steps">
                        {mapGuideSteps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    </div>
                    <div className="help-guide-card__visual">
                      <div className="help-guide-card__placeholder">
                        <Paperclip size={42} />
                        <span>导航示意图</span>
                      </div>
                    </div>
                  </article>
                </div>
              </section>
            </motion.div>
          )}
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {activeView === 'chat' && (
            <motion.div
              className="composer-shell"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
            >
              <div className="composer-inner">
                <div className="quick-replies">
                  {quickReplies.map(({ icon: Icon, label }) => (
                    <button
                      key={label}
                      type="button"
                      className="quick-reply"
                      onClick={() => openPrompt(label)}
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                <form className="composer" onSubmit={handleSubmit}>
                  <button
                    type="button"
                    className="composer__attach"
                    onClick={() => showNotice('图片与文件识别能力正在接入中')}
                    aria-label="添加附件"
                  >
                    <Paperclip size={22} />
                  </button>

                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void handleSubmit();
                      }
                    }}
                    placeholder="请输入您的问题..."
                    className="composer__input"
                  />

                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="composer__send"
                  >
                    <SendHorizontal size={20} />
                  </button>
                </form>

                <div className="composer-note">
                  {SERVICE_NAME} 可能出现误判，涉及售后与订单信息时请以人工客服确认为准。
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <nav className="mobile-nav" aria-label="移动端导航">
          {[
            { view: 'chat' as const, label: '对话', icon: MessageSquare },
            { view: 'recent' as const, label: '最近', icon: History },
            { view: 'faq' as const, label: '问题', icon: Bookmark },
            { view: 'help' as const, label: '帮助', icon: HelpCircle },
          ].map(({ view, label, icon: Icon }) => (
            <button
              key={view}
              type="button"
              className={activeView === view ? 'mobile-nav__item mobile-nav__item--active' : 'mobile-nav__item'}
              onClick={() => setActiveView(view)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </section>
      <AnimatePresence>
        {notice && (
          <motion.div
            className="app-toast"
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
          >
            <Clock3 size={17} />
            <span>{notice}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
