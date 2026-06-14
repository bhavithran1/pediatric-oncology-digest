import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  BarChart3,
  Bookmark,
  Library,
  Loader,
  RefreshCw,
  Search,
  ShieldCheck,
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

const INTRO_POINTS = [
  'See how active a research field is',
  'Read papers in parent-friendly language',
  'Bring clearer questions to your care team',
];

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
    <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
            <BarChart3 className="h-4 w-4" />
            Research progress
          </p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {usingPubMedCounts
              ? 'PubMed counts for this search, plus a quick summary of the papers below.'
              : 'Showing a quick summary from the papers loaded below.'}
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 dark:border-slate-800 dark:text-slate-300">
          <TrendingUp className="h-4 w-4" />
          {momentum}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
          <Library className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{(analytics?.allTime ?? articles.length).toLocaleString()}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{usingPubMedCounts ? 'all-time papers' : 'papers loaded'}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
          <Activity className="h-4 w-4 text-rose-500" />
          <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{(analytics?.recent ?? fallbackYearly.at(-1)?.count ?? 0).toLocaleString()}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{usingPubMedCounts ? 'past year' : 'this year loaded'}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
          <p className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{clinicalCount}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">trial-related</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Five-year trend</p>
          <div className="mt-2 flex h-24 items-end gap-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
            {yearly.map((item) => (
              <div key={item.year} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-14 w-full items-end">
                  <div
                    className="w-full rounded-t-lg bg-slate-900 transition-all dark:bg-slate-100"
                    style={{ height: `${Math.max((item.count / maxYearCount) * 100, item.count > 0 ? 8 : 0)}%` }}
                    title={`${item.count} papers in ${item.year}`}
                  />
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.year}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Study mix</p>
            <div className="mt-2 space-y-1.5">
              {stages.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                  <span className="font-semibold text-slate-950 dark:text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Top journals</p>
            <div className="mt-2 space-y-1.5">
              {journals.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
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
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
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

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
        {mainTab === 'saved' ? (
          <SavedArticles allArticles={articles || []} />
        ) : (
          <section className="min-w-0">
            <div className="flex min-h-[calc(100vh-88px)] flex-col justify-center py-12 sm:py-16">
              <div className="scroll-fade">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Built for parents and caregivers</p>
                <h2 className="mt-4 max-w-4xl text-4xl font-semibold tracking-normal text-slate-950 dark:text-white sm:text-6xl">
                  Learn what is changing in childhood cancer research.
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                  This guide helps families understand the progress happening across cancer fields, from new treatments to long-term side effects, without needing to read medical papers alone.
                </p>
              </div>

              <div className="scroll-reveal mt-8 grid gap-3 sm:grid-cols-3">
                {INTRO_POINTS.map((point) => (
                  <div key={point} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    {point}
                  </div>
                ))}
              </div>

              <a
                href="#research-search"
                className="mt-10 inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white"
              >
                Start searching
                <ArrowDown className="h-4 w-4" />
              </a>
            </div>

            <div id="research-search" className="scroll-reveal scroll-mt-24 py-8 sm:py-12">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Search the research</p>
              <h3 className="mt-3 max-w-3xl text-3xl font-semibold tracking-normal text-slate-950 dark:text-white sm:text-4xl">
                Find simple explanations and progress signals.
              </h3>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
                Search a cancer name, treatment, side effect, or question. Results show simple takeaways, research progress, and links to PubMed.
              </p>

              <div className="mt-7 rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                <form onSubmit={runSearch} className="flex flex-col gap-3 sm:flex-row">
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
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                  >
                    {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </button>
                </form>

                <div className="mt-3 flex flex-wrap gap-2 px-1">
                  {QUICK_SEARCHES.map((term) => (
                    <button
                      key={term}
                      onClick={() => applyQuickSearch(term)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-slate-400 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>

              <div className="scroll-reveal flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleTopicChange(item.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        topic === item.id
                          ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
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
                            ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
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
                  <div className="flex items-end justify-between gap-4 border-t border-slate-200 pt-5 dark:border-slate-800">
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
                        <div className="scroll-scale rounded-[2rem] border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                          Calculating research progress statistics...
                        </div>
                      ) : (
                        <div className="scroll-scale">
                          <ResearchAnalytics articles={articles} analytics={analytics} />
                        </div>
                      )}
                      {articles.map((article) => (
                        <div key={article.uid} className="scroll-reveal">
                          <ArticleCard article={article} audience="parent" />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </section>
        )}
      </main>
    </div>
  );
}
