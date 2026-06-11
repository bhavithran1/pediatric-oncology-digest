import { useState } from 'react';
import { ExternalLink, BookOpen, ChevronDown, ChevronUp, Loader, Bookmark } from 'lucide-react';
import { formatAuthors, journalBadgeColor, fetchAbstract, generateSummary } from '../utils/api';

function getSavedIds() { return JSON.parse(localStorage.getItem('digest_saved') || '[]'); }
function toggleSaved(pmid) {
  const saved = getSavedIds();
  const next = saved.includes(pmid) ? saved.filter(id => id !== pmid) : [...saved, pmid];
  localStorage.setItem('digest_saved', JSON.stringify(next));
  return next.includes(pmid);
}

export default function ArticleCard({ article, audience }) {
  const [saved, setSaved] = useState(() => getSavedIds().includes(article.uid));
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [abstract, setAbstract] = useState(null);

  const pmid = article.uid;
  const title = article.title?.replace(/<[^>]+>/g, '') || 'Untitled';
  const authors = formatAuthors(article.authors);
  const journal = article.fulljournalname || article.source;
  const pubDate = article.pubdate;
  const doi = article.elocationid?.replace('doi: ', '');
  const articleType = article.pubtype?.join(', ');

  async function handleExpand() {
    setExpanded(!expanded);
    if (!abstract && !loading) {
      setLoading(true);
      try {
        const text = await fetchAbstract(pmid);
        setAbstract(text);
        const s = generateSummary(text, audience, title);
        setSummary(s);
      } catch (e) {
        setAbstract('Abstract not available.');
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-sm transition-shadow">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg shrink-0">
            <BookOpen className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${journalBadgeColor(journal)}`}>
                {journal}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                {pubDate}
              </span>
              {articleType && articleType.includes('Randomized') && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  RCT
                </span>
              )}
            </div>

            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug mb-1">{title}</h3>
            {authors && <p className="text-xs text-gray-400 mb-2">{authors}</p>}

            <div className="flex items-center gap-3 mt-2">
              <a
                href={"https://pubmed.ncbi.nlm.nih.gov/" + pmid + "/"}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
              >
                PubMed <ExternalLink className="w-3 h-3" />
              </a>
              {doi && (
                <a
                  href={"https://doi.org/" + doi}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-gray-400 hover:text-rose-500 hover:underline flex items-center gap-1"
                >
                  DOI <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={() => setSaved(toggleSaved(pmid))}
                className={"p-1 rounded transition-colors " + (saved ? 'text-amber-500' : 'text-gray-400 hover:text-amber-400')}
                title={saved ? 'Remove bookmark' : 'Bookmark article'}
              >
                <Bookmark className="w-3.5 h-3.5" fill={saved ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={handleExpand}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                {expanded ? 'Hide' : 'Show'} Summary
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/30">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader className="w-4 h-4 animate-spin" />
              Loading abstract…
            </div>
          )}

          {!loading && summary && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">{summary.headline}</p>
              <ul className="space-y-1.5">
                {summary.points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                    <span className="shrink-0 w-4 h-4 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">
                      {i + 1}
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-400 italic mt-2">{summary.note}</p>
            </div>
          )}

          {!loading && abstract && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium mb-1">
                Full abstract
              </summary>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mt-2 whitespace-pre-line">{abstract}</p>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
