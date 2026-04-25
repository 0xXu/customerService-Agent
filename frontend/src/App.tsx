import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import {
  Bookmark,
  CalendarClock,
  HelpCircle,
  History,
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
  Wrench,
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

const recentSessions: ConversationSession[] = [
  {
    id: 'session-recharge',
    title: '自动回充失败排查',
    updatedAt: '今天 14:20',
    summary: '回充座位置、充电极片清洁、地图重建',
    tag: '故障排查',
    messages: [
      {
        id: 'sr-1',
        role: 'user',
        content: '机器人总是回充失败，怎么排查？',
      },
      {
        id: 'sr-2',
        role: 'assistant',
        content:
          '建议先确认充电座两侧留有足够空间，清洁机器人与底座的充电金属触点，再检查回充路径上是否有地毯边缘或障碍物。如果近期搬动过底座，建议重建地图后再尝试回充。',
      },
    ],
  },
  {
    id: 'session-suction',
    title: '吸力下降处理建议',
    updatedAt: '昨天 19:48',
    summary: '尘盒、滤网、主刷、边刷与风道清理',
    tag: '维护保养',
    messages: [
      {
        id: 'ss-1',
        role: 'user',
        content: '吸力变弱以后应该先检查哪里？',
      },
      {
        id: 'ss-2',
        role: 'assistant',
        content:
          '先检查尘盒是否已满、滤网是否堵塞，再查看主刷与边刷是否缠绕毛发。如果风道或吸入口被纸屑堵住，也会导致吸力明显下降，清理后通常会恢复正常。',
      },
    ],
  },
  {
    id: 'session-buying',
    title: '扫拖一体机选购',
    updatedAt: '周一 10:12',
    summary: '户型面积、宠物家庭、拖布提升与避障能力',
    tag: '售前咨询',
    messages: [
      {
        id: 'sb-1',
        role: 'user',
        content: '90 平米、有宠物，适合买哪类扫拖一体机？',
      },
      {
        id: 'sb-2',
        role: 'assistant',
        content:
          '建议优先选择具备强吸力、滚刷防缠绕、自动集尘和拖布自清洁能力的机型。如果家里杂物较多，还要关注避障能力和边角清扫表现，这类配置对宠物家庭更实用。',
      },
    ],
  },
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
    title: '售后处理流程',
    description: '报修前建议先准备设备型号、购买时间、故障现象和视频记录，提交后可加快排查。',
    action: '我要提交故障描述',
  },
  {
    title: '耗材维护提醒',
    description: '滤网、主刷、边刷、拖布是高频损耗件，建议按照清扫频率建立月度检查习惯。',
    action: '查看耗材更换建议',
  },
  {
    title: '地图与回充指导',
    description: '地图混乱、漏扫和回充失败，大多和底座位置、障碍物摆放及多楼层建图方式有关。',
    action: '查看回充排障清单',
  },
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
                    <div className="thinking-state" aria-label="思考中">
                      <span className="thinking-state__label">思考中</span>
                      <span className="thinking-state__dots">
                        <span className="thinking-state__dot" />
                        <span className="thinking-state__dot" />
                        <span className="thinking-state__dot" />
                      </span>
                    </div>
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
  const [sessions, setSessions] = useState<ConversationSession[]>(recentSessions);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(recentSessions[0].id);
  const [faqCategory, setFaqCategory] = useState<string>('全部');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeView !== 'chat') return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, activeView]);

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? sessions[0];

  const faqCategories = ['全部', ...new Set(faqItems.map((item) => item.category))];
  const filteredFaqs =
    faqCategory === '全部'
      ? faqItems
      : faqItems.filter((item) => item.category === faqCategory);

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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
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

            if (data.content === '[DONE]') {
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantMessageId
                    ? { ...message, isStreaming: false }
                    : message,
                ),
              );
              continue;
            }

            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, content: message.content + (data.content ?? '') }
                  : message,
              ),
            );
          } catch (error) {
            console.error('Failed to parse SSE payload:', error);
          }
        }
      }
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

      setSessions((prev) => {
        const nextMessages = [
          userMessage,
          {
            id: crypto.randomUUID(),
            role: 'assistant' as const,
            content: '本次会话已更新，可在最近会话中继续查看。',
          },
        ];
        const liveSession: ConversationSession = {
          id: 'live-session',
          title: prompt.length > 14 ? `${prompt.slice(0, 14)}...` : prompt,
          updatedAt: '刚刚',
          summary: '当前对话已同步到最近会话',
          tag: '当前会话',
          messages: cloneMessages([...messages, ...nextMessages]),
        };
        const withoutLive = prev.filter((item) => item.id !== 'live-session');
        return [liveSession, ...withoutLive];
      });
      setSelectedSessionId('live-session');
    }
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const prompt = input.trim();
    if (!prompt || isLoading) return;
    await sendPrompt(prompt);
  };

  const handleNewChat = () => {
    setMessages(createInitialMessages());
    setInput('');
    setIsLoading(false);
    setActiveView('chat');
  };

  const restoreConversation = (session: ConversationSession) => {
    setMessages(cloneMessages(session.messages));
    setActiveView('chat');
  };

  const openPrompt = (prompt: string) => {
    setInput(prompt);
    setActiveView('chat');
  };

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
            <button
              type="button"
              className={`lumina-nav__item ${activeView === 'help' ? 'lumina-nav__item--active' : ''}`}
              onClick={() => setActiveView('help')}
            >
              <HelpCircle size={20} />
              <span>帮助中心</span>
            </button>
          </nav>

          <div className="lumina-sidebar__footer">
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
            <button type="button" className="topbar__human">
              转人工服务
            </button>
            <button type="button" className="topbar__icon" onClick={() => setActiveView('recent')}>
              <History size={22} />
            </button>
            <button type="button" className="topbar__icon" onClick={() => setActiveView('help')}>
              <Settings size={22} />
            </button>
          </div>
        </header>

        <main className="chat-scroll">
          {activeView === 'chat' && (
            <div className="chat-column">
              <ChatMessages messages={messages} />
              <div ref={messagesEndRef} />
            </div>
          )}

          {activeView === 'recent' && (
            <div className="module-page module-page--recent">
              <section className="panel recent-list">
                <div className="panel__header">
                  <h2>最近会话</h2>
                  <p>查看近期咨询记录，并可一键恢复到对话窗口继续追问。</p>
                </div>

                <div className="recent-list__items">
                  {sessions.map((session) => (
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
                </div>
              </section>

              <section className="panel recent-preview">
                <div className="panel__header">
                  <h2>{selectedSession.title}</h2>
                  <p>{selectedSession.summary}</p>
                </div>

                <div className="recent-preview__messages">
                  <ChatMessages messages={selectedSession.messages} />
                </div>

                <div className="panel__actions">
                  <button
                    type="button"
                    className="solid-action"
                    onClick={() => restoreConversation(selectedSession)}
                  >
                    恢复到当前对话
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeView === 'faq' && (
            <div className="module-page">
              <section className="panel faq-overview">
                <div className="panel__header">
                  <h2>常用问题</h2>
                  <p>把高频咨询按场景分类，支持直接带入聊天继续问。</p>
                </div>

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

                <div className="faq-grid">
                  {filteredFaqs.map((item) => (
                    <article key={item.id} className="faq-card">
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
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeView === 'help' && (
            <div className="module-page">
              <section className="panel help-hero">
                <div className="panel__header">
                  <h2>帮助中心</h2>
                  <p>围绕售后、保养、报修和自助排障整理了常用操作入口。</p>
                </div>

                <div className="help-metrics">
                  <div className="metric-card">
                    <CalendarClock size={20} />
                    <div>
                      <strong>服务时间</strong>
                      <span>09:00 - 21:00，支持售后咨询与报障指引</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <ShieldCheck size={20} />
                    <div>
                      <strong>保修提示</strong>
                      <span>提交设备 SN、购买凭证与故障视频，处理效率更高</span>
                    </div>
                  </div>
                  <div className="metric-card">
                    <Search size={20} />
                    <div>
                      <strong>自助排障</strong>
                      <span>先做回充、吸力和异响三项基础检查，能覆盖大多数问题</span>
                    </div>
                  </div>
                </div>

                <div className="help-grid">
                  {helpCards.map((card) => (
                    <article key={card.title} className="help-card">
                      <h3>{card.title}</h3>
                      <p>{card.description}</p>
                      <button
                        type="button"
                        className="ghost-action"
                        onClick={() => openPrompt(card.action)}
                      >
                        {card.action}
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </main>

        <div className="composer-shell">
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
              <button type="button" className="composer__attach">
                <Paperclip size={22} />
              </button>

              <textarea
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
        </div>
      </section>
    </div>
  );
}
