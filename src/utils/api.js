// PubMed E-utilities API — free, no API key required
const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

// Curated pediatric oncology search topics
export const TOPICS = [
  { id: 'all', label: 'All Topics', query: 'pediatric oncology OR childhood cancer OR pediatric cancer' },
  { id: 'leukemia', label: 'Leukemia (ALL/AML)', query: 'pediatric leukemia OR childhood ALL OR childhood AML OR acute lymphoblastic leukemia children' },
  { id: 'brain', label: 'Brain Tumors', query: 'pediatric brain tumor OR childhood glioma OR medulloblastoma OR DIPG OR pediatric glioblastoma' },
  { id: 'lymphoma', label: 'Lymphoma', query: 'pediatric lymphoma OR childhood Hodgkin lymphoma OR childhood NHL' },
  { id: 'solid', label: 'Solid Tumors', query: 'Wilms tumor OR neuroblastoma OR rhabdomyosarcoma OR pediatric solid tumor OR Ewing sarcoma' },
  { id: 'immunotherapy', label: 'Immunotherapy', query: 'pediatric cancer immunotherapy OR CAR-T children OR pediatric checkpoint inhibitor' },
  { id: 'survivorship', label: 'Survivorship', query: 'childhood cancer survivor OR pediatric cancer late effects OR cancer survivorship children' },
  { id: 'precision', label: 'Precision Medicine', query: 'pediatric precision oncology OR childhood cancer genomics OR pediatric targeted therapy' },
];

export const AUDIENCES = [
  { id: 'clinician', label: 'Clinician', desc: 'Full technical detail, treatment protocols, clinical data' },
  { id: 'parent', label: 'Parent / Caregiver', desc: 'Plain language, focus on what it means for families' },
  { id: 'student', label: 'Student / Trainee', desc: 'Educational context with key terms explained' },
];

export async function searchPubMed({ topic, dateRange = 'recent', maxResults = 20 }) {
  const topicObj = TOPICS.find(t => t.id === topic) || TOPICS[0];
  let dateFilter = '';
  if (dateRange === 'recent') {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    dateFilter = `&datetype=pdat&mindate=${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/01`;
  } else if (dateRange === '3years') {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 3);
    dateFilter = `&datetype=pdat&mindate=${d.getFullYear()}/01/01`;
  }

  const searchUrl = `${PUBMED_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(topicObj.query)}&retmax=${maxResults}&sort=date&retmode=json${dateFilter}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  const ids = searchData.esearchresult?.idlist || [];
  if (ids.length === 0) return [];

  const summaryUrl = `${PUBMED_BASE}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
  const summaryRes = await fetch(summaryUrl);
  const summaryData = await summaryRes.json();
  const result = summaryData.result || {};
  return ids.map(id => result[id]).filter(Boolean);
}

export async function fetchAbstract(pmid) {
  const url = `${PUBMED_BASE}/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=text`;
  const res = await fetch(url);
  return res.text();
}

// Generate audience-appropriate summary from abstract text
export function generateSummary(abstract, audience, articleTitle) {
  if (!abstract || abstract.length < 50) return null;

  // Extract key sentences heuristically
  const sentences = abstract.split(/(?<=[.!?])\s+/).filter(s => s.length > 30);

  if (audience === 'parent') {
    return {
      headline: 'What this study found',
      points: extractKeyPoints(sentences, 3),
      note: 'This is a research summary written for families. Discuss any findings with your child\'s oncology team.',
    };
  } else if (audience === 'student') {
    return {
      headline: 'Key learning points',
      points: extractKeyPoints(sentences, 4),
      note: 'Review the full abstract for methodology and statistical details.',
    };
  } else {
    return {
      headline: 'Clinical summary',
      points: extractKeyPoints(sentences, 5),
      note: 'See full text for patient selection criteria and complete outcome data.',
    };
  }
}

function extractKeyPoints(sentences, n) {
  // Prefer sentences with outcome keywords
  const scored = sentences.map(s => {
    const sl = s.toLowerCase();
    let score = 0;
    if (/result|conclude|found|show|demonstrat|signif/i.test(sl)) score += 3;
    if (/surviv|remiss|response|outcome|efficacy|safety/i.test(sl)) score += 2;
    if (/patient|children|pediatric/i.test(sl)) score += 1;
    return { s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map(x => x.s);
}

export function formatAuthors(authors) {
  if (!authors || authors.length === 0) return '';
  if (authors.length <= 3) return authors.map(a => a.name).join(', ');
  return authors.slice(0, 3).map(a => a.name).join(', ') + ' et al.';
}

export function journalBadgeColor(journal) {
  const high = ['N Engl J Med', 'Lancet', 'JAMA', 'Nature', 'Blood', 'J Clin Oncol', 'Cancer Cell'];
  if (high.some(j => journal?.includes(j))) {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  }
  return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
}
