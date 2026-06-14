import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bookmark,
  CalendarDays,
  HeartHandshake,
  Library,
  Loader,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
} from 'lucide-react';
import { useDarkMode } from './hooks/useDarkMode';
import DarkToggle from './components/DarkToggle';
import ArticleCard from './components/ArticleCard';
import SavedArticles from './components/SavedArticles';
import { getResearchAnalytics, searchPubMed, TOPICS } from './utils/api';

const DATE_OPTIONS = [
  { v: 'recent', l: 'Past year' },
  { v: '3years', l: '3 years' },
  { v: 'all', l: 'All time' },
];

const QUICK_SEARCHES = ['ALL leukemia', 'medulloblastoma', 'CAR-T', 'late effects'];

function cleanText(value) {
  return value?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || '';
}

function getArticleStage(article) {
  const text = `${cleanText(article.title)} ${(article.pubtype || []).join(' ')}`.toLowerCase();
  if (/phase\s?iii|randomized|randomised|clinical trial/.test(text)) return 'Human trial';
  if (/phase\s?i|phase\s?ii|pilot|feasibility/.test(text)) return 'Early trial';
  if (/retrospective|cohort|registry|database/.test(text)) return 'Patient records';
  if (/mouse|murine|cell line|preclinical|xenograft/.test(text)) return 'Lab research';
  return 'Research paper';
}

function topCounts(items, limit = 3) {
  const counts = items.reduce((acc, item) => {
    if (!item) return acc;
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function getMomentumLabel(yearly) {
  if (!yearly?.length) return 'Building';
  const recent = yearly.at(-1)?.count || 0;
  const previous = yearly.at(-2)?.count || 0;
  if (recent === 0 && previous === 0) return 'Early field';
  if (recent >= previous * 1.2) return 'Growing';
  if (recent < previous * 0.75) return 'Cooling';
  return 'Steady';
}

function ResearchAnalytics({ articles, analytics }) {
  const currentYear = new Date().getFullYear();
  const fallbackYearly = Array.from({ length: 5 }, (_, index) => {
    const year = currentYear - 4 + index;
    return {
      year,
      count: articles.filter((article) => article.pubdate?.includes(String(year))).length,
    };
  });
  const yearly = analytics?.yearly?.length ? analytics.yearly : fallbackYearly;
  const maxYearCount = Math.max(...yearly.map((item) => item.count), 1);
  const stages = topCounts(articles.map(getArticleStage), 4);
  const journals = topCounts(articles.map((article) => article.fulljournalname || article.source), 3);
  const clinicalCount = articles.filter((article) => /trial|randomized|randomised|phase/i.test((article.pubtype || []).join(' ') + cleanText(article.title))).length;
  const momentum = getMomentumLabel(yearly);
  const usingPubMedCounts = Boolean(analytics);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-teal-700 dark:text-teal-300">
            <BarChart3 className="h-4 w-4" />
            Field progress snapshot
          </p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">What the research activity looks like</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {usingPubMedCounts
              ? 'Counts come from PubMed for this exact search. Study mix and journals summarize the papers shown below.'
              : 'PubMed count data is temporarily unavailable, so this snapshot summarizes the papers shown below.'}
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-200">
          <TrendingUp className="h-4 w-4" />
          {momentum} momentum
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
          <Library className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">{(analytics?.allTime ?? articles.length).toLocaleString()}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{usingPubMedCounts ? 'matching papers all time' : 'visible papers loaded'}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
          <Activity className="h-4 w-4 text-rose-500" />
          <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">{(analytics?.recent ?? fallbackYearly.at(-1)?.count ?? 0).toLocaleString()}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{usingPubMedCounts ? 'published in the past year' : 'visible papers this year'}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
          <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">{clinicalCount}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">visible papers that mention trials</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Publication trend</p>
          <div className="mt-3 flex h-36 items-end gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
            {yearly.map((item) => (
              <div key={item.year} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-24 w-full items-end">
                  <div
                    className="w-full rounded-t-xl bg-teal-600 transition-all dark:bg-teal-400"
                    style={{ height: `${Math.max((item.count / maxYearCount) * 100, item.count > 0 ? 8 : 0)}%` }}
                    title={`${item.count} papers in ${item.year}`}
                  />
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.year}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Study mix shown</p>
            <div className="mt-3 space-y-2">
              {stages.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950">
                  <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                  <span className="font-semibold text-slate-950 dark:text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Most common journals shown</p>
            <div className="mt-3 space-y-2">
              {journals.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950">
                  <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">{item.label}</span>
                  <span className="shrink-0 font-semibold text-slate-950 dark:text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ParentResearchMap() {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">How to read a study</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">Follow the research story</h2>
        </div>
        <Sparkles className="h-5 w-5 text-amber-500" />
      </div>

      <div className="research-motion mt-5" aria-hidden="true">
        <div className="research-step research-step-one">
          <span>1</span>
          <strong>Question</strong>
          <small>What were doctors trying to learn?</small>
        </div>
        <div className="research-path">
          <i />
        </div>
        <div className="research-step research-step-two">
          <span>2</span>
          <strong>Test</strong>
          <small>Who was studied, and what changed?</small>
        </div>
        <div className="research-path">
          <i />
        </div>
        <div className="research-step research-step-three">
          <span>3</span>
          <strong>Meaning</strong>
          <small>Could this matter for families now?</small>
        </div>
      </div>
    </section>
  );
}

function ResearchPulse({ loading, count }) {
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <CalendarDays className="h-4 w-4 text-teal-600 dark:text-teal-300" />
        <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">{loading ? '...' : count}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">research papers found</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <HeartHandshake className="h-4 w-4 text-rose-500" />
        <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">Plain</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">family-first explanations</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
        <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">PubMed</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">source-linked research</p>
      </div>
    </section>
  );
}

export default function App() {
  const [dark, toggleDark] = useDarkMode();
  const [topic, setTopic] = useState('all');
  const [dateRange, setDateRange] = useState('recent');
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [articles, setArticles] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);
  const [mainTab, setMainTab] = useState('browse');

  const savedCount = (() => {
    try {
      return JSON.parse(localStorage.getItem('digest_saved') || '[]').length;
    } catch {
      return 0;
    }
  })();

  async function loadArticles(next = {}) {
    const nextTopic = next.topic ?? topic;
    const nextDateRange = next.dateRange ?? dateRange;
    const nextQuery = next.query ?? submittedQuery;

    setLoading(true);
    setAnalyticsLoading(true);
    setError(null);
    try {
      const data = await searchPubMed({
        topic: nextTopic,
        dateRange: nextDateRange,
        query: nextQuery,
        maxResults: 18,
      });
      setArticles(data);
      try {
        const stats = await getResearchAnalytics({
          topic: nextTopic,
          query: nextQuery,
        });
        setAnalytics(stats);
      } catch {
        setAnalytics(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setAnalyticsLoading(false);
    }
  }

  useEffect(() => {
    const initialSearch = window.setTimeout(() => {
      loadArticles({ topic: 'all', dateRange: 'recent', query: '' });
    }, 0);
    return () => window.clearTimeout(initialSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runSearch(event) {
    event?.preventDefault();
    const cleaned = query.trim();
    setSubmittedQuery(cleaned);
    loadArticles({ query: cleaned });
  }

  function handleTopicChange(nextTopic) {
    setTopic(nextTopic);
    loadArticles({ topic: nextTopic });
  }

  function handleDateChange(nextDateRange) {
    setDateRange(nextDateRange);
    loadArticles({ dateRange: nextDateRange });
  }

  function applyQuickSearch(term) {
    setQuery(term);
    setSubmittedQuery(term);
    loadArticles({ query: term });
  }

  return (
    <div className="min-h-screen bg-[#f7f9f8] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-slate-950 dark:text-white">Child Cancer Research Guide</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Plain answers from current medical literature</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMainTab('browse')}
              className={`hidden rounded-full px-4 py-2 text-sm font-medium transition sm:block ${
                mainTab === 'browse'
                  ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
              }`}
            >
              Search
            </button>
            <button
              onClick={() => setMainTab('saved')}
              className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition ${
                mainTab === 'saved'
                  ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
              }`}
            >
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">Saved</span>
              {savedCount > 0 && <span>{savedCount}</span>}
            </button>
            <DarkToggle dark={dark} toggle={toggleDark} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
        {mainTab === 'saved' ? (
          <SavedArticles allArticles={articles || []} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="min-w-0">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
                <p className="text-sm font-medium text-teal-700 dark:text-teal-300">For parents and caregivers</p>
                <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal text-slate-950 dark:text-white sm:text-5xl">
                  Understand what child cancer research is saying right now.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                  Search a cancer name, treatment, side effect, or question. Each paper opens into simple takeaways, a visual research flow, and links back to the original PubMed source.
                </p>

                <form onSubmit={runSearch} className="mt-7 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950 sm:flex-row">
                  <label className="flex min-w-0 flex-1 items-center gap-3 px-3">
                    <Search className="h-5 w-5 shrink-0 text-slate-400" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search: leukemia, brain tumor, CAR-T, nausea, relapse..."
                      className="h-12 min-w-0 flex-1 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-400 dark:text-white"
                    />
                  </label>
                  <button
                    disabled={loading}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                  >
                    {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search research
                  </button>
                </form>

                <div className="mt-4 flex flex-wrap gap-2">
                  {QUICK_SEARCHES.map((term) => (
                    <button
                      key={term}
                      onClick={() => applyQuickSearch(term)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-teal-300 hover:text-teal-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-600"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleTopicChange(item.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        topic === item.id
                          ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex rounded-full border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
                    {DATE_OPTIONS.map((option) => (
                      <button
                        key={option.v}
                        onClick={() => handleDateChange(option.v)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                          dateRange === option.v
                            ? 'bg-teal-700 text-white'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        }`}
                      >
                        {option.l}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => loadArticles()}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {loading && (
                <div className="mt-8 flex items-center justify-center gap-3 rounded-[2rem] border border-slate-200 bg-white py-16 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <Loader className="h-5 w-5 animate-spin text-teal-600" />
                  Searching PubMed for parent-friendly research signals...
                </div>
              )}

              {!loading && articles !== null && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">
                        {articles.length} research papers
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {submittedQuery ? `Search focus: ${submittedQuery}` : 'Showing the newest childhood cancer research'}
                      </p>
                    </div>
                  </div>
                  {articles.length === 0 ? (
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                      No papers found for this search. Try a broader cancer name or treatment term.
                    </div>
                  ) : (
                    <>
                      {analyticsLoading ? (
                        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                          Calculating research progress statistics...
                        </div>
                      ) : (
                        <ResearchAnalytics articles={articles} analytics={analytics} />
                      )}
                      {articles.map((article) => (
                        <ArticleCard key={article.uid} article={article} audience="parent" />
                      ))}
                    </>
                  )}
                </div>
              )}
            </section>

            <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
              <ResearchPulse loading={loading} count={articles?.length ?? 0} />
              <ParentResearchMap />
              <section className="rounded-[2rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Questions to bring to clinic</h2>
                <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  <p>Does this study include children like mine?</p>
                  <p>Is this already standard care, a clinical trial, or early lab research?</p>
                  <p>What benefits and side effects did researchers actually measure?</p>
                </div>
              </section>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
