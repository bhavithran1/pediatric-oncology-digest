import { useState } from 'react';
import { Bookmark, Download, Trash2, FileText } from 'lucide-react';

function exportRIS(articles) {
  const entries = articles.map(a => {
    const authors = (a.authors || []).map(au => au.name);
    const year = a.pubdate?.match(/\d{4}/)?.[0] || '';
    const lines = [
      'TY  - JOUR',
      `TI  - ${a.title?.replace(/<[^>]+>/g, '') || ''}`,
      ...authors.map(au => `AU  - ${au}`),
      `JO  - ${a.fulljournalname || a.source || ''}`,
      `PY  - ${year}`,
      `UR  - https://pubmed.ncbi.nlm.nih.gov/${a.uid}/`,
      'ER  - ',
    ];
    return lines.join('\n');
  }).join('\n\n');

  const blob = new Blob([entries], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pediatric_oncology_references.ris';
  a.click();
  URL.revokeObjectURL(url);
}

function exportBibtex(articles) {
  const entries = articles.map(a => {
    const authors = (a.authors || []).map(au => au.name).join(' and ');
    const year = a.pubdate?.match(/\d{4}/)?.[0] || 'n.d.';
    const pmid = a.uid;
    return `@article{pmid${pmid},
  author    = {${authors}},
  title     = {${a.title?.replace(/<[^>]+>/g, '') || ''}},
  journal   = {${a.fulljournalname || a.source || ''}},
  year      = {${year}},
  pmid      = {${pmid}},
  url       = {https://pubmed.ncbi.nlm.nih.gov/${pmid}/}
}`;
  }).join('\n\n');

  const blob = new Blob([entries], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pediatric_oncology_references.bib';
  a.click();
  URL.revokeObjectURL(url);
}

export default function SavedArticles({ allArticles }) {
  const [savedIds] = useState(() => JSON.parse(localStorage.getItem('digest_saved') || '[]'));
  const saved = allArticles.filter(a => savedIds.includes(a.uid));

  function removeSaved(pmid) {
    const ids = JSON.parse(localStorage.getItem('digest_saved') || '[]').filter(id => id !== pmid);
    localStorage.setItem('digest_saved', JSON.stringify(ids));
    window.location.reload(); // simple refresh
  }

  if (saved.length === 0) return (
    <div className="text-center py-12 text-gray-400 space-y-2">
      <Bookmark className="w-10 h-10 mx-auto opacity-20" />
      <p className="text-sm">No saved articles yet.</p>
      <p className="text-xs">Click the bookmark icon on any article to save it here.</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-amber-500" /> Saved Articles ({saved.length})
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => exportBibtex(saved)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:border-amber-300 hover:text-amber-600 transition-colors"
          >
            <Download className="w-3 h-3" /> BibTeX
          </button>
          <button
            onClick={() => exportRIS(saved)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:border-amber-300 hover:text-amber-600 transition-colors"
          >
            <Download className="w-3 h-3" /> RIS
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {saved.map(a => (
          <div key={a.uid} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-3">
            <FileText className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug" dangerouslySetInnerHTML={{ __html: a.title || 'Untitled' }} />
              <p className="text-xs text-gray-400 mt-0.5">{a.fulljournalname} · {a.pubdate}</p>
              <a href={`https://pubmed.ncbi.nlm.nih.gov/${a.uid}/`} target="_blank" rel="noopener noreferrer"
                 className="text-xs text-rose-600 hover:underline">PMID {a.uid}</a>
            </div>
            <button onClick={() => removeSaved(a.uid)} className="shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
