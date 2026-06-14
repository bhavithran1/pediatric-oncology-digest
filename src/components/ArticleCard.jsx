import { useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FlaskConical,
  HelpCircle,
  Loader,
  MessageCircleQuestion,
} from 'lucide-react';
import { fetchAbstract, formatAuthors, generateSummary } from '../utils/api';

function getSavedIds() {
  try {
    return JSON.parse(localStorage.getItem('digest_saved') || '[]');
  } catch {
    return [];
  }
}

function toggleSaved(pmid) {
  const saved = getSavedIds();
  const next = saved.includes(pmid) ? saved.filter((id) => id !== pmid) : [...saved, pmid];
  localStorage.setItem('digest_saved', JSON.stringify(next));
  return next.includes(pmid);
}

function cleanText(value) {
  return value?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || '';
}

function detectResearchStage(text) {
  const lower = text.toLowerCase();
  if (/phase\s?iii|randomized|randomised|clinical trial/.test(lower)) return 'Human trial';
  if (/phase\s?i|phase\s?ii|pilot|feasibility/.test(lower)) return 'Early trial';
  if (/retrospective|cohort|registry|database/.test(lower)) return 'Patient records';
  if (/mouse|murine|cell line|preclinical|xenograft/.test(lower)) return 'Lab research';
  return 'Research paper';
}

function pickFamilyQuestion(title, abstract) {
  const text = `${title} ${abstract}`.toLowerCase();
  if (/toxicity|adverse|side effect|safety/.test(text)) return 'What side effects or safety concerns did the study notice?';
  if (/surviv|relapse|recurr|response|remission/.test(text)) return 'Did children do better, stay well longer, or respond differently?';
  if (/genom|mutation|molecular|precision|targeted/.test(text)) return 'Could tumor testing help guide treatment choices?';
  if (/quality of life|late effect|survivor|neurocognitive/.test(text)) return 'How might this affect life during or after treatment?';
  return 'What did researchers learn, and is it ready for care today?';
}

function ResearchFlow({ stage }) {
  return (
    <div className="mini-flow" aria-label="Animated research explanation">
      <div className="mini-flow-node is-active">
        <span />
        <strong>Study idea</strong>
      </div>
      <div className="mini-flow-line"><i /></div>
      <div className="mini-flow-node is-active">
        <span />
        <strong>{stage}</strong>
      </div>
      <div className="mini-flow-line"><i /></div>
      <div className="mini-flow-node">
        <span />
        <strong>Care meaning</strong>
      </div>
    </div>
  );
}

export default function ArticleCard({ article, audience }) {
  const [saved, setSaved] = useState(() => getSavedIds().includes(article.uid));
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [abstract, setAbstract] = useState(null);

  const pmid = article.uid;
  const title = cleanText(article.title) || 'Untitled research paper';
  const authors = formatAuthors(article.authors);
  const journal = article.fulljournalname || article.source || 'Medical journal';
  const pubDate = article.pubdate;
  const doi = article.elocationid?.replace('doi: ', '');
  const articleType = article.pubtype?.join(', ');
  const stage = detectResearchStage(`${title} ${articleType || ''} ${abstract || ''}`);
  const familyQuestion = pickFamilyQuestion(title, abstract || '');

  async function handleExpand() {
    setExpanded(!expanded);
    if (!abstract && !loading) {
      setLoading(true);
      try {
        const text = await fetchAbstract(pmid);
        setAbstract(text);
        setSummary(generateSummary(text, audience, title));
      } catch {
        setAbstract('Abstract not available.');
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300 sm:flex">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {stage}
              </span>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                {pubDate}
              </span>
              {articleType && (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  {articleType.split(',')[0]}
                </span>
              )}
            </div>

            <h3 className="text-lg font-semibold leading-snug text-slate-950 dark:text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {journal}{authors ? ` · ${authors}` : ''}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={handleExpand}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {expanded ? 'Close explanation' : 'Explain simply'}
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setSaved(toggleSaved(pmid))}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                  saved
                    ? 'border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white'
                    : 'border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
                title={saved ? 'Remove from saved articles' : 'Save article'}
              >
                <Bookmark className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
                {saved ? 'Saved' : 'Save'}
              </button>
              <a
                href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                PubMed <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {doi && (
                <a
                  href={`https://doi.org/${doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  DOI <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/60">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader className="h-4 w-4 animate-spin text-teal-600" />
              Reading the abstract and turning it into plain language...
            </div>
          )}

          {!loading && (
            <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <ResearchFlow stage={stage} />
                <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  <HelpCircle className="mb-2 h-4 w-4" />
                  {familyQuestion}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                {summary ? (
                  <>
                    <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      <MessageCircleQuestion className="h-4 w-4" />
                      {summary.headline}
                    </h4>
                    <div className="mt-4 space-y-3">
                      {summary.points.map((point, index) => (
                        <div key={point} className="flex gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white dark:bg-white dark:text-slate-950">
                            {index + 1}
                          </span>
                          <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{point}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">{summary.note}</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">A simple summary is not available for this abstract.</p>
                )}

                {abstract && abstract !== 'Abstract not available.' && (
                  <details className="mt-4 text-sm">
                    <summary className="cursor-pointer font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                      Read the original abstract
                    </summary>
                    <p className="mt-3 whitespace-pre-line leading-7 text-slate-600 dark:text-slate-300">{abstract}</p>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
