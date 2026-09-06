import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import {
  Activity, ArrowRight, AudioLines, Bot, Brain, Check, ChevronDown, CircleHelp, Clock3,
  Compass, FileText, FolderKanban, Globe2, KeyRound, Library, LockKeyhole, Menu, MessageCircle,
  MoreHorizontal, Paperclip, Plus, RefreshCw, Route as RouteIcon, Send, Settings2, ShieldCheck,
  Sparkles, Target, Trash2, Upload, UserRound, X, Zap,
} from 'lucide-react';
import {
  getGetConversationQueryKey, getGetDashboardQueryKey, getGetPreferencesQueryKey,
  getListAgentsQueryKey, getListConversationsQueryKey, getListIntegrationCapabilitiesQueryKey,
  getListMemoryQueryKey, getListPlansQueryKey, getListProjectsQueryKey,
  useCreateConversation, useCreateProject, useDeleteMemory, useGetConversation, useGetDashboard,
  useGetPreferences, useListAgents, useListConversations, useListIntegrationCapabilities,
  useListMemory, useListPlans, useListProjects, useSendMessage, useUpdateMemory,
  useUpdatePreferences,
} from '@workspace/api-client-react';
import type { PreferencesUpdateUnitSystem } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch as UiSwitch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const navItems = [
  { href: '/dashboard', label: 'Command center', icon: Compass },
  { href: '/chat', label: 'Conversations', icon: MessageCircle },
  { href: '/agents', label: 'Agent library', icon: Bot },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
];
const utilityItems = [
  { href: '/memory', label: 'Memory', icon: Brain },
  { href: '/settings', label: 'Preferences', icon: Settings2 },
  { href: '/plans', label: 'Plans', icon: Zap },
  { href: '/help', label: 'Trust & help', icon: CircleHelp },
];

function LoadingBlock({ className = '' }: { className?: string }) {
  return <div className={cn('shimmer rounded-xl', className)} aria-label="Loading" data-testid="loading-block" />;
}

function EmptyState({ icon: Icon, title, detail, action }: { icon: typeof Brain; title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 text-center" data-testid="empty-state">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/25 text-primary"><Icon size={20} /></div>
      <h3 className="font-display text-xl text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{detail}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function ErrorState({ retry }: { retry: () => void }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-destructive/25 bg-destructive/5 px-6 text-center" data-testid="status-error">
      <ShieldCheck size={20} className="mb-2 text-destructive" />
      <p className="text-sm font-semibold">This space could not be reached</p>
      <p className="mt-1 text-sm text-muted-foreground">Your work is safe. Try again, or come back in a moment.</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={retry} data-testid="button-retry">Try again</Button>
    </div>
  );
}

function PageTitle({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-mono-ui text-[10px] font-medium uppercase tracking-[.18em] text-primary">{eyebrow}</p>
        <h1 className="mt-2 font-display text-4xl leading-[.95] tracking-tight text-foreground sm:text-5xl" data-testid="text-page-title">{title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{detail}</p>
      </div>
      {action}
    </div>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const initials = (user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0] ?? 'G').toUpperCase();
  return (
    <div className="app-noise min-h-[100dvh] bg-background">
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[258px] flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 transition-transform duration-300 lg:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')} data-testid="sidebar">
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-2.5" data-testid="link-brand">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-sidebar"><Sparkles size={17} strokeWidth={2.5} /></span>
            <span className="font-display text-[22px] text-sidebar-foreground">global<span className="text-accent">.</span></span>
          </Link>
          <button className="rounded-lg p-2 text-sidebar-foreground/60 lg:hidden" onClick={() => setMobileOpen(false)} data-testid="button-close-menu"><X size={18} /></button>
        </div>
        <div className="mt-9 px-2 font-mono-ui text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/40">Your operating system</div>
        <nav className="mt-3 space-y-1" aria-label="Main navigation">
          {navItems.map(({ href, label, icon: Icon }) => <NavItem key={href} href={href} label={label} Icon={Icon} active={location === href} onClick={() => setMobileOpen(false)} />)}
        </nav>
        <div className="mt-8 px-2 font-mono-ui text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/40">Personal controls</div>
        <nav className="mt-3 space-y-1">
          {utilityItems.map(({ href, label, icon: Icon }) => <NavItem key={href} href={href} label={label} Icon={Icon} active={location === href} onClick={() => setMobileOpen(false)} />)}
        </nav>
        <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/70 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-sidebar-foreground"><LockKeyhole size={14} className="text-accent" /> Private by design</div>
          <p className="mt-2 text-[11px] leading-5 text-sidebar-foreground/55">You choose what Global remembers. Nothing is silently added.</p>
          <Link href="/memory" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-accent" data-testid="link-memory-sidebar">Review memory <ArrowRight size={12} /></Link>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-sidebar-border px-2 pt-4">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-bold text-sidebar">{initials}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-sidebar-foreground">{user?.firstName ?? 'Your account'}</p><p className="truncate text-[10px] text-sidebar-foreground/50">{user?.emailAddresses?.[0]?.emailAddress ?? 'Personal workspace'}</p></div>
          <button onClick={() => signOut({ redirectUrl: basePath || '/' })} className="p-1.5 text-sidebar-foreground/50 hover:text-accent" title="Sign out" data-testid="button-sign-out"><KeyRound size={14} /></button>
        </div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-30 bg-sidebar/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-overlay-close" />}
      <main className="min-h-[100dvh] lg:pl-[258px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border/70 bg-background/80 px-5 backdrop-blur-xl sm:px-8">
          <button className="rounded-xl p-2 text-muted-foreground hover:bg-muted lg:hidden" onClick={() => setMobileOpen(true)} data-testid="button-open-menu"><Menu size={20} /></button>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="h-2 w-2 rounded-full bg-accent" /> Your context is yours</div>
          <div className="ml-auto flex items-center gap-3"><span className="hidden font-mono-ui text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">Global AI / personal</span><div className="h-7 w-px bg-border" /><Link href="/settings" className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-muted-foreground" data-testid="link-profile"><UserRound size={15} /></Link></div>
        </header>
        <div className="mx-auto max-w-[1320px] px-5 py-8 sm:px-8 lg:px-10">{children}</div>
      </main>
    </div>
  );
}

function NavItem({ href, label, Icon, active, onClick }: { href: string; label: string; Icon: typeof Brain; active: boolean; onClick: () => void }) {
  return <Link href={href} onClick={onClick} className={cn('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors', active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground')} data-testid={`link-nav-${href.slice(1)}`}><Icon size={17} className={cn('transition-transform group-hover:translate-x-0.5', active ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/60')} /><span>{label}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary-foreground" />}</Link>;
}

function PublicHome() {
  const { isSignedIn } = useAuth();
  return (
    <div className="min-h-[100dvh] overflow-hidden bg-background">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" data-testid="link-public-brand"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles size={17} /></span><span className="font-display text-2xl">global<span className="text-primary">.</span></span></Link>
        <div className="flex items-center gap-2"><Link href={isSignedIn ? '/dashboard' : '/sign-in'} className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground" data-testid="link-sign-in">{isSignedIn ? 'Open workspace' : 'Sign in'}</Link><Link href="/sign-up" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:-translate-y-0.5 transition-transform" data-testid="link-sign-up">Begin thinking <ArrowRight size={14} className="ml-1 inline" /></Link></div>
      </header>
      <section className="relative mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:pb-28 lg:pt-28">
        <div className="pointer-events-none absolute -right-28 top-0 h-[500px] w-[500px] rounded-full bg-accent/20 blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="rise-in font-mono-ui text-[11px] uppercase tracking-[.2em] text-primary">A calm interface for complicated lives</p>
          <h1 className="rise-in delay-1 mt-5 max-w-4xl font-display text-[clamp(4rem,11vw,9rem)] leading-[.83] tracking-[-.055em] text-foreground">Think in<br /><em className="text-primary">possibilities.</em></h1>
          <p className="rise-in delay-2 mt-8 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">Global AI is a personal operating system for moving from a knotty problem to a clear plan, useful momentum, and an outcome you can feel.</p>
          <div className="rise-in delay-3 mt-9 flex flex-wrap gap-3"><Link href="/sign-up" className="rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="button-hero-start">Start with a question <ArrowRight size={16} className="ml-2 inline" /></Link><Link href="/help" className="rounded-xl border border-border bg-card/60 px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-card" data-testid="button-hero-trust">How it works</Link></div>
        </div>
        <div className="relative mt-20 grid gap-4 md:grid-cols-[1.2fr_.8fr]">
          <div className="overflow-hidden rounded-[28px] border border-primary/20 bg-primary p-6 text-primary-foreground shadow-2xl shadow-primary/10 sm:p-9">
            <div className="flex items-center justify-between"><span className="font-mono-ui text-[10px] uppercase tracking-[.18em] opacity-65">The thinking loop</span><span className="flex items-center gap-2 text-[11px] opacity-70"><span className="h-2 w-2 rounded-full bg-accent" /> Ready when you are</span></div>
           <div className="mt-16 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-4">{[['01','Problem'],['02','Understanding'],['03','Plan'],['04','Outcome']].map(([num,label], i) => <div key={label} className="relative">{i < 3 && <span className="absolute left-12 top-3 hidden h-px w-[calc(100%-1rem)] bg-primary-foreground/20 sm:block" />}<span className="font-mono-ui text-[10px] opacity-50">{num}</span><p className="mt-2 font-display text-2xl">{label}</p></div>)}</div>
            <div className="mt-16 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4 text-sm"><span className="opacity-50">You</span><p className="mt-2 leading-6">“I know this matters. I don't know what to do next.”</p><div className="my-4 h-px bg-primary-foreground/10" /><span className="opacity-50">Global</span><p className="mt-2 font-display text-lg leading-6">“Let's find the shape of the problem first.”</p></div>
          </div>
          <div className="flex flex-col justify-between rounded-[28px] border border-border bg-card p-6 sm:p-8"><div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/30 text-primary"><Globe2 size={21} /></span><h2 className="mt-8 font-display text-4xl leading-none">One mind.<br />Many lenses.</h2><p className="mt-4 text-sm leading-6 text-muted-foreground">A coordinated set of specialists helps you see the decision, the detail, and the human side at once.</p></div><div className="mt-10 flex flex-wrap gap-2">{['Strategy','Research','Writing','Life design','Execution'].map((x) => <span key={x} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground">{x}</span>)}</div></div>
        </div>
      </section>
      <section className="border-y border-border bg-card/45"><div className="mx-auto grid max-w-7xl gap-0 px-5 sm:px-8 md:grid-cols-3">{[['01','Bring the whole context','No need to flatten your question into a prompt. Start wherever you are.'],['02','See the route','Global makes its reasoning visible and asks before taking consequential action.'],['03','Keep the thread','Your projects, preferences, and chosen memories stay under your control.']].map(([num,title,detail]) => <div key={num} className="border-b border-border py-10 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0"><span className="font-mono-ui text-xs text-primary">{num}</span><h3 className="mt-5 font-display text-2xl">{title}</h3><p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">{detail}</p></div>)}</div></section>
      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-10 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8"><span className="font-display text-lg text-foreground">global.</span><span>International by nature. Personal by default.</span><Link href="/help" className="text-primary hover:underline" data-testid="link-footer-help">Trust center</Link></footer>
    </div>
  );
}

function DashboardPage() {
  const dashboard = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });
  const projects = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });
  if (dashboard.isLoading) return <><PageTitle eyebrow="Today" title="Making space to think." detail="Your command center is gathering the threads." /><div className="grid gap-4 md:grid-cols-3"><LoadingBlock className="h-32" /><LoadingBlock className="h-32" /><LoadingBlock className="h-32" /></div><LoadingBlock className="mt-5 h-64" /></>;
  if (dashboard.isError || !dashboard.data) return <ErrorState retry={() => dashboard.refetch()} />;
  const d = dashboard.data;
  return <div className="rise-in"><PageTitle eyebrow="Command center" title={d.greeting || 'Good to see you.'} detail="A gentle view of what is moving, what is waiting, and where your attention might matter next." action={<Link href="/chat" className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground" data-testid="button-open-chat">Open a conversation <ArrowRight size={14} className="ml-1 inline" /></Link>} />
    <div className="grid gap-4 md:grid-cols-3"><Metric label="Active projects" value={d.activeProjects} detail="spaces with a next step" icon={FolderKanban} /><Metric label="Conversations" value={d.conversationsThisWeek} detail="this week, across every lens" icon={MessageCircle} /><Metric label="Outcome progress" value={`${Math.round(d.outcomeProgress)}%`} detail="toward the outcomes you set" icon={Target} accent /></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]"><section className="rounded-2xl border border-border bg-card p-5 sm:p-7"><div className="flex items-center justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.17em] text-muted-foreground">Active thread</p><h2 className="mt-2 font-display text-3xl">Keep the signal.</h2></div><Activity size={20} className="text-primary" /></div>{projects.isLoading ? <LoadingBlock className="mt-7 h-24" /> : projects.data && projects.data.length ? <div className="mt-7 space-y-3">{projects.data.slice(0, 3).map((p) => <Link href="/projects" key={p.id} className="group flex items-center gap-4 rounded-xl border border-border/70 bg-background/40 p-4 hover:border-primary/40" data-testid={`card-project-${p.id}`}><div className="relative h-10 w-10 shrink-0 rounded-xl bg-muted"><span className="absolute inset-x-0 bottom-0 rounded-xl bg-accent" style={{ height: `${Math.max(12, p.progress)}%` }} /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-semibold">{p.name}</p><span className="font-mono-ui text-[10px] text-muted-foreground">{p.progress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p.progress}%` }} /></div></div><ArrowRight size={15} className="text-muted-foreground transition-transform group-hover:translate-x-1" /></Link>)}</div> : <EmptyState icon={FolderKanban} title="No active project yet" detail="Give a question a little room to become a project." action={<Link href="/projects" className="text-sm font-semibold text-primary" data-testid="link-create-first-project">Create your first project <ArrowRight size={13} className="ml-1 inline" /></Link>} />}</section>
      <section className="rounded-2xl border border-border bg-primary p-5 text-primary-foreground sm:p-7"><p className="font-mono-ui text-[10px] uppercase tracking-[.17em] opacity-60">Recent movement</p><h2 className="mt-2 font-display text-3xl">A little progress counts.</h2><div className="mt-7 space-y-5">{(d.recentActivity ?? []).slice(0, 4).map((a) => <div key={a.id} className="flex gap-3" data-testid={`activity-${a.id}`}><span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', a.tone === 'amber' ? 'bg-accent' : a.tone === 'teal' ? 'bg-[#72d4c1]' : 'bg-primary-foreground/60')} /><div><p className="text-sm font-semibold">{a.label}</p><p className="mt-1 text-xs leading-5 opacity-65">{a.detail}</p><p className="mt-1 font-mono-ui text-[9px] opacity-45">{new Date(a.timestamp).toLocaleDateString()}</p></div></div>)}</div></section></div>
  </div>;
}

function Metric({ label, value, detail, icon: Icon, accent = false }: { label: string; value: string | number; detail: string; icon: typeof Brain; accent?: boolean }) {
  return <div className={cn('rounded-2xl border border-border bg-card p-5', accent && 'border-accent/50 bg-accent/15')} data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{label}</span><Icon size={17} className={accent ? 'text-primary' : 'text-muted-foreground'} /></div><p className="mt-5 font-display text-4xl">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

function ChatPage() {
  const [selectedId, setSelectedId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [input, setInput] = useState('');
  const [route, setRoute] = useState<{ agentName: string; model: string; reason: string; needsPermission: boolean } | null>(null);
  const conversations = useListConversations({ query: { queryKey: getListConversationsQueryKey() } });
  const agents = useListAgents({ query: { queryKey: getListAgentsQueryKey() } });
  const create = useCreateConversation();
  const send = useSendMessage();
  const selected = selectedId || conversations.data?.[0]?.id || '';
  const detail = useGetConversation(selected, { query: { enabled: !!selected, queryKey: getGetConversationQueryKey(selected) } });
  useEffect(() => { if (!agentId && agents.data?.[0]) setAgentId(agents.data[0].id); }, [agents.data, agentId]);
  const submit = () => { if (!input.trim() || !selected || send.isPending) return; const content = input.trim(); setInput(''); send.mutate({ conversationId: selected, data: { content, attachmentName: null } }, { onSuccess: (res) => { setRoute(res.route); queryClient.invalidateQueries({ queryKey: getGetConversationQueryKey(selected) }); queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() }); } }); };
  const start = () => create.mutate({ data: { title: 'New thinking session', agentId: agentId || 'generalist' } }, { onSuccess: (c) => { setSelectedId(c.id); queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() }); } });
  return <div className="rise-in"><PageTitle eyebrow="Conversation workspace" title="What is taking shape?" detail="Bring the unfinished thought. Global will help you choose the right lens before it reaches for an answer." action={<Button onClick={start} disabled={create.isPending} data-testid="button-new-conversation"><Plus size={15} /> New conversation</Button>} />
    <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_260px]"><section className="order-2 rounded-2xl border border-border bg-card p-3 xl:order-1"><div className="flex items-center justify-between px-2 py-2"><p className="font-mono-ui text-[10px] uppercase tracking-[.17em] text-muted-foreground">Saved threads</p><span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{conversations.data?.length ?? 0}</span></div>{conversations.isLoading ? <div className="space-y-2 p-2"><LoadingBlock className="h-16" /><LoadingBlock className="h-16" /></div> : conversations.data?.length ? <div className="mt-2 space-y-1">{conversations.data.map((c) => <button key={c.id} onClick={() => setSelectedId(c.id)} className={cn('w-full rounded-xl p-3 text-left transition-colors', selected === c.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')} data-testid={`button-conversation-${c.id}`}><p className="truncate text-sm font-semibold">{c.title}</p><p className={cn('mt-1 truncate text-[11px]', selected === c.id ? 'text-primary-foreground/65' : 'text-muted-foreground')}>{c.preview || 'No preview yet'}</p><p className={cn('mt-2 font-mono-ui text-[9px]', selected === c.id ? 'text-primary-foreground/50' : 'text-muted-foreground')}>{c.messageCount} messages</p></button>)}</div> : <div className="px-2 py-8"><EmptyState icon={MessageCircle} title="No threads yet" detail="Start one when you are ready." /></div>}</section>
      <section className="order-1 flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-card xl:order-2"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.17em] text-primary">Live workspace</p><p className="mt-1 text-sm font-semibold">{detail.data?.conversation.title ?? 'A new line of thought'}</p></div><div className="flex items-center gap-2"><span className="hidden rounded-full bg-accent/25 px-2.5 py-1 text-[10px] font-semibold text-primary sm:inline">AI is honest about its limits</span><button className="rounded-lg p-2 text-muted-foreground hover:bg-muted" data-testid="button-chat-more"><MoreHorizontal size={17} /></button></div></div><div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">{detail.isLoading ? <><LoadingBlock className="ml-auto h-20 max-w-[75%]" /><LoadingBlock className="h-28 max-w-[80%]" /></> : detail.data?.messages?.length ? detail.data.messages.map((m) => <div key={m.id} className={cn('max-w-[88%] rounded-2xl p-4 text-sm leading-6', m.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'border border-border bg-background/60')} data-testid={`message-${m.id}`}><p>{m.content}</p>{m.role === 'assistant' && <div className="mt-3 flex items-center gap-2 border-t border-border/60 pt-2 text-[10px] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> {m.confidence} confidence {m.citations?.length ? `· ${m.citations.length} sources` : ''}</div>}</div>) : <div className="flex h-full min-h-[340px] flex-col items-center justify-center px-8 text-center"><div className="relative grid h-16 w-16 place-items-center rounded-[22px] bg-accent/25 text-primary"><Sparkles size={26} /><span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-card bg-primary" /></div><h2 className="mt-5 font-display text-3xl">Start with the real question.</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Live AI is not connected in this environment yet. Your message will be routed transparently when the service is ready.</p></div>}{send.isError && <div className="mx-auto max-w-md rounded-xl border border-accent/50 bg-accent/15 px-4 py-3 text-center text-xs leading-5 text-foreground" data-testid="status-chat-honest">The live AI service is not configured yet. Your draft stayed here; nothing was sent beyond this workspace.</div>}</div><div className="border-t border-border p-4"><div className="flex items-center gap-2 rounded-2xl border border-border bg-background/70 p-2 focus-within:border-primary/60"><button className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted" title="Attach a file" data-testid="button-attach"><Paperclip size={17} /></button><textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} placeholder="Bring a question, decision, or half-formed idea…" className="min-h-11 flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none placeholder:text-muted-foreground/70" data-testid="input-chat-message" /><button className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted" title="Voice input" data-testid="button-voice"><AudioLines size={17} /></button><Button size="icon" onClick={submit} disabled={!input.trim() || !selected || send.isPending} data-testid="button-send-message"><Send size={16} /></Button></div><p className="mt-2 px-1 text-[10px] text-muted-foreground">Enter to send · Shift + Enter for a new line · no external action without your permission</p></div></section>
      <aside className="order-3 space-y-4"><div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2"><RouteIcon size={16} className="text-primary" /><p className="text-sm font-semibold">Orchestration route</p></div>{route ? <div className="mt-4 space-y-3 text-xs"><div className="rounded-xl bg-accent/20 p-3"><p className="font-semibold text-primary">{route.agentName}</p><p className="mt-1 text-muted-foreground">{route.reason}</p></div><div className="flex justify-between text-muted-foreground"><span>Model</span><span className="font-mono-ui text-[10px]">{route.model}</span></div><div className="flex items-center gap-2 text-muted-foreground"><span className={cn('h-1.5 w-1.5 rounded-full', route.needsPermission ? 'bg-accent' : 'bg-[#72d4c1]')} />{route.needsPermission ? 'Permission needed before action' : 'No permission needed'}</div></div> : <p className="mt-4 text-xs leading-5 text-muted-foreground">The route will appear here before any live response. This is how you stay in the loop.</p>}</div><div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm font-semibold">Choose a lens</p><p className="mt-1 text-xs leading-5 text-muted-foreground">The orchestrator can still change this when your question needs it.</p><select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="mt-4 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs outline-none focus:border-primary" data-testid="select-agent">{agents.data?.map((a) => <option key={a.id} value={a.id}>{a.shortName || a.name}</option>) ?? <option value="">General thinking</option>}</select></div></aside></div>
  </div>;
}

function AgentsPage() {
  const agents = useListAgents({ query: { queryKey: getListAgentsQueryKey() } });
  const integrations = useListIntegrationCapabilities({ query: { queryKey: getListIntegrationCapabilitiesQueryKey() } });
  const [category, setCategory] = useState('All');
  const categories = ['All', ...Array.from(new Set((agents.data ?? []).map((a) => a.category)))];
  const filtered = (agents.data ?? []).filter((a) => category === 'All' || a.category === category);
  return <div className="rise-in"><PageTitle eyebrow="Agent library" title="Many lenses. One direction." detail="Specialists for the moments when a second perspective changes the quality of the next step." action={<Link href="/chat" className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground" data-testid="button-agents-chat">Choose in chat <ArrowRight size={14} className="ml-1 inline" /></Link>} /><div className="mb-6 flex gap-2 overflow-x-auto pb-1">{categories.map((c) => <button key={c} onClick={() => setCategory(c)} className={cn('whitespace-nowrap rounded-full border px-3 py-2 text-xs transition-colors', category === c ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary/50')} data-testid={`filter-agent-${c}`}>{c}</button>)}</div>{agents.isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><LoadingBlock className="h-40" /><LoadingBlock className="h-40" /><LoadingBlock className="h-40" /></div> : agents.isError ? <ErrorState retry={() => agents.refetch()} /> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((a) => <div key={a.id} className="group rounded-2xl border border-border bg-card p-5 transition-transform hover:-translate-y-1" data-testid={`card-agent-${a.id}`}><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl text-primary" style={{ backgroundColor: `${a.accent}22` }}><Bot size={19} /></span>{a.recommended && <span className="rounded-full bg-accent/25 px-2 py-1 font-mono-ui text-[9px] uppercase tracking-wider text-primary">For you</span>}</div><h3 className="mt-6 font-display text-2xl">{a.name}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{a.description}</p><div className="mt-5 flex items-center justify-between"><span className="font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">{a.category}</span><Link href="/chat" className="text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100" data-testid={`link-use-agent-${a.id}`}>Use lens <ArrowRight size={12} className="ml-1 inline" /></Link></div></div>)}</div>}<section className="mt-10 border-t border-border pt-8"><p className="font-mono-ui text-[10px] uppercase tracking-[.17em] text-muted-foreground">On the horizon</p><h2 className="mt-2 font-display text-3xl">Your tools, when you are ready.</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(integrations.data ?? []).map((i) => <div key={i.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-4" data-testid={`integration-${i.id}`}><span className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground"><Zap size={15} /></span><div><p className="text-sm font-semibold">{i.name}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{i.description}</p><span className="mt-2 inline-block font-mono-ui text-[9px] uppercase tracking-wider text-primary">{i.status}</span></div></div>)}</div></section></div>;
}

function ProjectsPage() {
  const projects = useListProjects({ query: { queryKey: getListProjectsQueryKey() } });
  const create = useCreateProject();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const submit = () => { if (!form.name.trim()) return; create.mutate({ data: form }, { onSuccess: () => { setForm({ name: '', description: '' }); setOpen(false); queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() }); queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() }); } }); };
  return <div className="rise-in"><PageTitle eyebrow="Projects & workspaces" title="Give your outcomes a home." detail="Projects hold the context that makes good thinking compound over time." action={<Button onClick={() => setOpen(true)} data-testid="button-new-project"><Plus size={15} /> New project</Button>} />{open && <div className="mb-6 rounded-2xl border border-primary/30 bg-card p-5 sm:p-6" data-testid="form-new-project"><div className="flex items-center justify-between"><h2 className="font-display text-2xl">Name the next chapter.</h2><button onClick={() => setOpen(false)} className="text-muted-foreground" data-testid="button-cancel-project"><X size={18} /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Project name<Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2" placeholder="The thing you want to move" data-testid="input-project-name" /></label><label className="text-xs font-semibold">Description<Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2" placeholder="What would make this worth finishing?" data-testid="input-project-description" /></label></div><Button className="mt-4" onClick={submit} disabled={!form.name.trim() || create.isPending} data-testid="button-submit-project">{create.isPending ? 'Creating…' : 'Create project'} <ArrowRight size={14} /></Button></div>}{projects.isLoading ? <div className="grid gap-4 md:grid-cols-2"><LoadingBlock className="h-52" /><LoadingBlock className="h-52" /></div> : projects.isError ? <ErrorState retry={() => projects.refetch()} /> : projects.data?.length ? <div className="grid gap-4 md:grid-cols-2">{projects.data.map((p) => <div key={p.id} className="rounded-2xl border border-border bg-card p-5 sm:p-6" data-testid={`project-${p.id}`}><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-primary"><FolderKanban size={18} /></span><span className={cn('rounded-full px-2.5 py-1 font-mono-ui text-[9px] uppercase tracking-wider', p.status === 'complete' ? 'bg-[#d4eee7] text-[#1f7566]' : p.status === 'paused' ? 'bg-muted text-muted-foreground' : 'bg-accent/25 text-primary')}>{p.status}</span></div><h2 className="mt-6 font-display text-3xl">{p.name}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{p.description || 'A space for the next useful step.'}</p><div className="mt-7 flex items-center justify-between text-xs"><span className="text-muted-foreground">Progress</span><span className="font-mono-ui text-primary">{p.progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${p.progress}%` }} /></div><div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-[10px] text-muted-foreground"><span>{p.agentIds?.length ?? 0} lenses attached</span><span>Updated {new Date(p.updatedAt).toLocaleDateString()}</span></div></div>)}</div> : <EmptyState icon={FolderKanban} title="Your first project is a blank canvas" detail="Projects are a way to turn a conversation into something you can return to." action={<Button onClick={() => setOpen(true)} data-testid="button-empty-new-project"><Plus size={15} /> Create a project</Button>} />}</div>;
}

function MemoryPage() {
  const memory = useListMemory({ query: { queryKey: getListMemoryQueryKey() } });
  const update = useUpdateMemory();
  const remove = useDeleteMemory();
  const toggle = (id: string, enabled: boolean) => update.mutate({ memoryId: id, data: { enabled } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMemoryQueryKey() }) });
  const del = (id: string) => { if (window.confirm('Delete this memory from your personal context?')) remove.mutate({ memoryId: id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMemoryQueryKey() }) }); };
  return (
    <div className="rise-in">
      <PageTitle eyebrow="Personal memory" title="You are in control." detail="These are the details Global can use to make future thinking more relevant. Switch them off or remove them at any time." action={<div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs"><LockKeyhole size={14} className="text-primary" /> Private context</div>} />
      <div className="mb-6 rounded-2xl border border-accent/40 bg-accent/15 p-4 sm:p-5">
        <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-primary" size={18} /><div><p className="text-sm font-semibold">Nothing is remembered without a seam you can see.</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Memory is for continuity, not surveillance. It is never sold or used to make decisions about you.</p></div></div>
      </div>
      {memory.isLoading && <div className="space-y-3"><LoadingBlock className="h-24" /><LoadingBlock className="h-24" /></div>}
      {memory.isError && <ErrorState retry={() => memory.refetch()} />}
      {!memory.isLoading && !memory.isError && memory.data?.length ? (
        <div className="space-y-3">
          {memory.data.map((m) => (
            <div key={m.id} className={cn('flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between', m.enabled ? 'border-border' : 'border-border/60 opacity-65')} data-testid={`memory-${m.id}`}>
              <div className="flex gap-3"><div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-primary"><Brain size={16} /></div><div><p className="text-sm font-semibold">{m.label}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{m.value}</p><p className="mt-2 font-mono-ui text-[9px] uppercase tracking-wider text-muted-foreground">From {m.source} · updated {new Date(m.updatedAt).toLocaleDateString()}</p></div></div>
              <div className="flex items-center gap-4 sm:pl-5"><label className="flex items-center gap-2 text-xs text-muted-foreground"><UiSwitch checked={m.enabled} onCheckedChange={(checked) => toggle(m.id, checked)} data-testid={`switch-memory-${m.id}`} /> {m.enabled ? 'Enabled' : 'Off'}</label><button onClick={() => del(m.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete memory" data-testid={`button-delete-memory-${m.id}`}><Trash2 size={15} /></button></div>
            </div>
          ))}
        </div>
      ) : null}
      {!memory.isLoading && !memory.isError && !memory.data?.length && <EmptyState icon={Brain} title="A clean slate" detail="When a useful preference emerges, you will be asked before it joins your memory." />}
    </div>
  );
}

function SettingsPage() {
  const preferences = useGetPreferences({ query: { queryKey: getGetPreferencesQueryKey() } });
  const update = useUpdatePreferences();
  const [form, setForm] = useState<{ language: string; region: string; timezone: string; dateFormat: string; unitSystem: PreferencesUpdateUnitSystem }>({ language: '', region: '', timezone: '', dateFormat: '', unitSystem: 'metric' });
  useEffect(() => { if (preferences.data) setForm({ ...preferences.data, unitSystem: preferences.data.unitSystem }); }, [preferences.data]);
  const save = () => update.mutate({ data: form }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetPreferencesQueryKey() }) });
  return <div className="rise-in"><PageTitle eyebrow="Preferences" title="Make it feel like yours." detail="Regional defaults shape dates, units, and language. They never change the quality of your thinking." action={<Button onClick={save} disabled={update.isPending || !preferences.data} data-testid="button-save-preferences">{update.isPending ? 'Saving…' : 'Save changes'} <Check size={15} /></Button>} />{preferences.isLoading ? <LoadingBlock className="h-80" /> : preferences.isError ? <ErrorState retry={() => preferences.refetch()} /> : <div className="max-w-3xl rounded-2xl border border-border bg-card p-5 sm:p-7"><div className="grid gap-6 sm:grid-cols-2"><label className="text-xs font-semibold">Language<select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm font-normal outline-none focus:border-primary" data-testid="select-language"><option value="en">English</option><option value="es">Español</option><option value="fr">Français</option><option value="ja">日本語</option></select></label><label className="text-xs font-semibold">Region<Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="mt-2" placeholder="e.g. GB" data-testid="input-region" /></label><label className="text-xs font-semibold">Timezone<Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="mt-2" placeholder="e.g. Europe/London" data-testid="input-timezone" /></label><label className="text-xs font-semibold">Date format<select value={form.dateFormat} onChange={(e) => setForm({ ...form, dateFormat: e.target.value })} className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm font-normal outline-none focus:border-primary" data-testid="select-date-format"><option value="DD/MM/YYYY">DD / MM / YYYY</option><option value="MM/DD/YYYY">MM / DD / YYYY</option><option value="YYYY-MM-DD">YYYY - MM - DD</option></select></label></div><div className="mt-8 border-t border-border pt-6"><p className="text-xs font-semibold">Unit system</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{[['metric','Metric','Celsius, kilometres, kilograms'],['imperial','Imperial','Fahrenheit, miles, pounds']].map(([value,title,detail]) => <button key={value} onClick={() => setForm({ ...form, unitSystem: value as PreferencesUpdateUnitSystem })} className={cn('rounded-xl border p-4 text-left transition-colors', form.unitSystem === value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40')} data-testid={`button-unit-${value}`}><div className="flex items-center justify-between"><span className="text-sm font-semibold">{title}</span>{form.unitSystem === value && <Check size={15} className="text-primary" />}</div><p className="mt-1 text-xs text-muted-foreground">{detail}</p></button>)}</div></div><div className="mt-8 rounded-xl bg-muted/60 p-4"><div className="flex gap-3"><ShieldCheck size={17} className="mt-0.5 text-primary" /><div><p className="text-sm font-semibold">Privacy is a preference too</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Review what is remembered, manage your account, or read how your data moves through Global.</p><Link href="/memory" className="mt-2 inline-block text-xs font-semibold text-primary" data-testid="link-settings-memory">Review personal memory <ArrowRight size={12} className="ml-1 inline" /></Link></div></div></div></div>}</div>;
}

function PlansPage() {
  const plans = useListPlans({ query: { queryKey: getListPlansQueryKey() } });
  const [annual, setAnnual] = useState(true);
  const [chosen, setChosen] = useState('');
  return <div className="rise-in"><PageTitle eyebrow="Plans" title="Room to think, at your pace." detail="Choose the amount of context and capacity that fits your season. Checkout is a test state here; no card details are collected." action={<div className="flex items-center gap-2 rounded-full border border-border bg-card p-1 text-xs"><button onClick={() => setAnnual(false)} className={cn('rounded-full px-3 py-1.5', !annual && 'bg-muted font-semibold')} data-testid="button-monthly">Monthly</button><button onClick={() => setAnnual(true)} className={cn('rounded-full px-3 py-1.5', annual && 'bg-primary text-primary-foreground font-semibold')} data-testid="button-annual">Annual · save 20%</button></div>} />{plans.isLoading ? <div className="grid gap-4 lg:grid-cols-4"><LoadingBlock className="h-96" /><LoadingBlock className="h-96" /><LoadingBlock className="h-96" /><LoadingBlock className="h-96" /></div> : plans.isError ? <ErrorState retry={() => plans.refetch()} /> : <div className="grid gap-4 lg:grid-cols-4">{(plans.data ?? []).map((p) => <div key={p.id} className={cn('relative flex flex-col rounded-2xl border bg-card p-5', p.highlighted ? 'border-primary shadow-lg shadow-primary/10' : 'border-border')} data-testid={`plan-${p.id}`}>{p.highlighted && <span className="absolute -top-3 left-5 rounded-full bg-accent px-3 py-1 font-mono-ui text-[9px] uppercase tracking-wider text-primary">Most considered</span>}<p className="font-mono-ui text-[10px] uppercase tracking-[.17em] text-muted-foreground">{p.name}</p><p className="mt-5 font-display text-4xl">{annual ? `$${p.annualPrice}` : `$${p.monthlyPrice}`}<span className="font-sans text-xs text-muted-foreground"> / mo</span></p><p className="mt-3 min-h-12 text-sm leading-5 text-muted-foreground">{p.description}</p><div className="my-6 h-px bg-border" /><ul className="flex-1 space-y-3">{p.features.map((f) => <li key={f} className="flex gap-2 text-xs leading-5"><Check size={14} className="mt-0.5 shrink-0 text-primary" />{f}</li>)}</ul><Button variant={p.highlighted ? 'default' : 'outline'} className="mt-7 w-full" onClick={() => setChosen(p.id)} data-testid={`button-choose-plan-${p.id}`}>{chosen === p.id ? 'Test checkout ready' : p.name === 'Free' ? 'Keep Free' : 'Choose plan'}</Button></div>)}</div>}<div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-card/60 p-4 text-xs leading-5 text-muted-foreground"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" /><span>Test checkout only in this preview. Global will never ask for a card number in chat, memory, or support.</span></div></div>;
}

function HelpPage() {
  return <div className="rise-in"><PageTitle eyebrow="Trust & help" title="Good questions are welcome." detail="A clear answer is part of the product. Here is how Global works, what it cannot do yet, and where to find control." /><div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]"><div className="space-y-3">{[['What happens to my conversations?','They stay connected to your account so you can return to your work. Use Memory to decide what may carry across conversations.'],['Does Global take actions for me?','Not without you. Orchestration is visible, and consequential actions will ask for permission before anything leaves the workspace.'],['Is live AI available here?','Not yet in this environment. The chat workspace is ready, but it will say so plainly rather than pretend a response is live.'],['How do I remove context?','Open Personal memory, switch an item off, or delete it. Your choices are respected across future sessions.']].map(([q,a], i) => <details key={q} className="group rounded-2xl border border-border bg-card p-5" open={i === 0} data-testid={`help-question-${i}`}><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">{q}<ChevronDown size={16} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{a}</p></details>)}</div><div className="rounded-2xl border border-border bg-primary p-6 text-primary-foreground sm:p-8"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-primary"><CircleHelp size={21} /></div><h2 className="mt-8 font-display text-4xl leading-none">Need a human thread?</h2><p className="mt-4 text-sm leading-6 opacity-70">Support is part of trust. Tell us what felt unclear and we will make the path easier to see.</p><a href="mailto:care@global.ai" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-4 py-3 text-sm font-semibold text-primary" data-testid="link-contact-support">Contact support <ArrowRight size={14} /></a><div className="mt-14 border-t border-primary-foreground/20 pt-4 font-mono-ui text-[10px] uppercase tracking-[.16em] opacity-55">No dark patterns. No silent memory.</div></div></div></div>;
}

function Protected({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="grid min-h-[100dvh] place-items-center bg-background"><LoadingBlock className="h-16 w-56" /></div>;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <AppShell>{children}</AppShell>;
}

function SignInPage() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-8"><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}
function SignUpPage() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-8"><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><Switch>
    <Route path="/" component={PublicHome} />
    <Route path="/sign-in/*?" component={SignInPage} />
    <Route path="/sign-up/*?" component={SignUpPage} />
    <Route path="/dashboard"><Protected><DashboardPage /></Protected></Route>
    <Route path="/chat"><Protected><ChatPage /></Protected></Route>
    <Route path="/agents"><Protected><AgentsPage /></Protected></Route>
    <Route path="/projects"><Protected><ProjectsPage /></Protected></Route>
    <Route path="/memory"><Protected><MemoryPage /></Protected></Route>
    <Route path="/settings"><Protected><SettingsPage /></Protected></Route>
    <Route path="/plans"><Protected><PlansPage /></Protected></Route>
    <Route path="/help"><Protected><HelpPage /></Protected></Route>
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;
}

function ClerkApp() {
  const [, setLocation] = useLocation();
  const stripBase = (path: string) => basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
  const appearance = {
    theme: shadcn, cssLayerName: 'clerk',
    options: { logoPlacement: 'inside' as const, logoLinkUrl: basePath || '/', logoImageUrl: `${window.location.origin}${basePath}/logo.svg` },
    variables: { colorPrimary: '#17465a', colorForeground: '#20363d', colorMutedForeground: '#60767c', colorBackground: '#f6fbfa', colorInput: '#edf5f3', colorInputForeground: '#20363d', colorNeutral: '#c4d7d7', colorDanger: '#b85049', fontFamily: 'Manrope, sans-serif', borderRadius: '0.85rem' },
    elements: { rootBox: 'w-full flex justify-center', cardBox: 'bg-[#f6fbfa] rounded-2xl w-[440px] max-w-full overflow-hidden', card: '!shadow-none !border-0 !bg-transparent !rounded-none', headerTitle: 'font-display text-3xl', headerSubtitle: 'text-muted-foreground', formFieldInput: 'bg-[#edf5f3] border-[#c4d7d7]', formButtonPrimary: 'bg-[#17465a] hover:bg-[#12394a]', footerActionLink: 'text-[#17465a]', logoImage: 'max-h-10' },
  };
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={appearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{ signIn: { start: { title: 'Welcome back', subtitle: 'Return to your thinking space' } }, signUp: { start: { title: 'Begin your thread', subtitle: 'A calmer way to move forward' } } }} routerPush={(to) => setLocation(stripBase(to))} routerReplace={(to) => setLocation(stripBase(to), { replace: true })}><QueryClientProvider client={queryClient}><Router /></QueryClientProvider></ClerkProvider>;
}

function App() {
  return <TooltipProvider><WouterRouter base={basePath}><ClerkApp /></WouterRouter><Toaster /></TooltipProvider>;
}

export default App;