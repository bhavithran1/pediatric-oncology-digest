import { useDarkMode } from './hooks/useDarkMode';
import DarkToggle from './components/DarkToggle';
import { useState, useEffect } from 'react';
import { BookOpen, Loader, AlertTriangle, RefreshCw, Filter, Bookmark } from 'lucide-react';
import ArticleCard from './components/ArticleCard';
import SavedArticles from './components/SavedArticles';
import { searchPubMed, TOPICS, AUDIENCES } from './utils/api';

export default function App() {
  const [dark, toggleDark] = useDarkMode();
  const [topic, setTopic] = useState('all');
  const [dateRange, setDateRange] = useState('recent');
  const [audience, setAudience] = useState('clinician');
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState(null);
  const [error, setError] = useState(null);
  const [mainTab, setMainTab] = useState('browse'); // browse | saved

  async function loadArticles(t = topic, d = dateRange) {
    setLoading(true);
    setError(null);
    try {
      const data = await searchPubMed({ topic: t, dateRange: d });
      setArticles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArticles('all', 'recent');
  }, []);

  function handleTopicChange(t) {
    setTopic(t);
    loadArticles(t, dateRange);
  }

  function handleDateChange(d) {
    setDateRange(d);
    loadArticles(topic, d);
  }

  const savedCount = JSON.parse(localStorage.getItem('digest_saved') || '[]').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 dark:from-gray-950 dark:via-gray-900 dark:to-rose-950">
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-600 rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-none">Pediatric Oncology Literature Digest</h1>
              <p className="text-xs text-gray-400 mt-0.5">PubMed · Live research summaries</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DarkToggle dark={dark} toggle={toggleDark} />
            <button onClick={() => loadArticles()} disabled={loading}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-rose-500 transition-colors">
              <RefreshCw className={"w-3 h-3 " + (loading ? 'animate-spin' : '')} /> Refresh
            </button>
          </div>
        </div>
        {/* Main tabs */}
        <div className="max-w-5xl mx-auto px-4 pb-2 flex gap-2">
          <button
            onClick={() => setMainTab('browse')}
            className={"text-xs px-4 py-1.5 rounded-lg font-medium border transition-colors " + (
              mainTab === 'browse'
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
            )}
          >
            Browse Literature
          </button>
          <button
            onClick={() => setMainTab('saved')}
            className={"flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-medium border transition-colors " + (
              mainTab === 'saved'
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
            )}
          >
            <Bookmark className="w-3 h-3" /> Reading List
            {savedCount > 0 && (
              <span className={"ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold " + (mainTab === 'saved' ? 'bg-white/20' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400')}>
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {mainTab === 'saved' ? (
          <SavedArticles allArticles={articles || []} />
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Latest Pediatric Oncology Research
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto text-sm">
                Curated summaries of the newest PubMed literature in pediatric cancer — filtered by topic, explained for your audience.
              </p>
            </div>

            {/* Audience selector */}
            <div className="mb-6">
              <p className="text-xs font-medium text-gray-500 mb-2 text-center">I am a:</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {AUDIENCES.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setAudience(a.id)}
                    className={"px-4 py-2 rounded-xl text-sm font-medium border transition-colors " + (
                      audience === a.id
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-rose-300'
                    )}
                    title={a.desc}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic + date filters */}
            <div className="flex flex-wrap gap-3 mb-6 items-center">
              <Filter className="w-4 h-4 text-gray-400" />
              <div className="flex flex-wrap gap-2">
                {TOPICS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleTopicChange(t.id)}
                    className={"text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border " + (
                      topic === t.id
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-rose-300'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex gap-2">
                {[{ v: 'recent', l: 'Past year' }, { v: '3years', l: '3 years' }, { v: 'all', l: 'All time' }].map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => handleDateChange(opt.v)}
                    className={"text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors " + (
                      dateRange === opt.v
                        ? 'bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                    )}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center gap-2 py-16">
                <Loader className="w-6 h-6 text-rose-500 animate-spin" />
                <span className="text-sm text-gray-500">Fetching latest papers from PubMed…</span>
              </div>
            )}

            {!loading && articles !== null && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">{articles.length} articles found</p>
                {articles.length === 0 && (
                  <p className="text-center text-gray-400 py-8">No articles found for this topic and date range.</p>
                )}
                {articles.map(a => (
                  <ArticleCard key={a.uid} article={a} audience={audience} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
