// PubMed E-utilities API — free, no API key required
const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

// Curated pediatric oncology search topics
export const TOPICS = [
  { id: 'all', label: 'All childhood cancers', query: 'pediatric oncology OR childhood cancer OR pediatric cancer' },
  { id: 'leukemia', label: 'Leukemia', query: 'pediatric leukemia OR childhood ALL OR childhood AML OR acute lymphoblastic leukemia children' },
  { id: 'brain', label: 'Brain tumors', query: 'pediatric brain tumor OR childhood glioma OR medulloblastoma OR DIPG OR pediatric glioblastoma' },
  { id: 'lymphoma', label: 'Lymphoma', query: 'pediatric lymphoma OR childhood Hodgkin lymphoma OR childhood NHL' },
  { id: 'solid', label: 'Solid tumors', query: 'Wilms tumor OR neuroblastoma OR rhabdomyosarcoma OR pediatric solid tumor OR Ewing sarcoma' },
  { id: 'immunotherapy', label: 'Immune treatments', query: 'pediatric cancer immunotherapy OR CAR-T children OR pediatric checkpoint inhibitor' },
  { id: 'survivorship', label: 'Life after treatment', query: 'childhood cancer survivor OR pediatric cancer late effects OR cancer survivorship children' },
  { id: 'precision', label: 'Gene-guided care', query: 'pediatric precision oncology OR childhood cancer genomics OR pediatric targeted therapy' },
];

export const AUDIENCES = [
  { id: 'parent', label: 'Parent / Caregiver', desc: 'Plain language, focus on what it means for families' },
  { id: 'clinician', label: 'Clinician', desc: 'Full technical detail, treatment protocols, clinical data' },
  { id: 'student', label: 'Student / Trainee', desc: 'Educational context with key terms explained' },
];

export async function searchPubMed({ topic, dateRange = 'recent', maxResults = 20, query = '' }) {
  const searchTerm = buildSearchTerm(topic, query);
  let dateFilter = buildDateFilter(dateRange);

  const searchUrl = `${PUBMED_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(searchTerm)}&retmax=${maxResults}&sort=date&retmode=json${dateFilter}`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error('PubMed search is not available right now. Please try again in a moment.');
  const searchData = await searchRes.json();
  const ids = searchData.esearchresult?.idlist || [];
  if (ids.length === 0) return [];

  const summaryUrl = `${PUBMED_BASE}/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`;
  const summaryRes = await fetch(summaryUrl);
  if (!summaryRes.ok) throw new Error('Article details could not be loaded right now.');
  const summaryData = await summaryRes.json();
  const result = summaryData.result || {};
  return ids.map(id => result[id]).filter(Boolean);
}

export async function getResearchAnalytics({ topic, query = '' }) {
  const searchTerm = buildSearchTerm(topic, query);
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: 5 }, (_, index) => currentYear - 4 + index);
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  const allTime = await fetchPubMedCount(searchTerm);
  const recent = await fetchPubMedCount(searchTerm, {
    mindate: `${oneYearAgo.getFullYear()}/${String(oneYearAgo.getMonth() + 1).padStart(2, '0')}/01`,
    maxdate: `${currentYear}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`,
  });
  const yearCounts = [];

  for (const year of years) {
    yearCounts.push(await fetchPubMedCount(searchTerm, {
      mindate: `${year}/01/01`,
      maxdate: `${year}/12/31`,
    }));
  }

  return {
    allTime,
    recent,
    yearly: years.map((year, index) => ({ year, count: yearCounts[index] })),
  };
}

function buildSearchTerm(topic, query = '') {
  const topicObj = TOPICS.find(t => t.id === topic) || TOPICS[0];
  const cleanedQuery = query.trim();
  return cleanedQuery
    ? `(${topicObj.query}) AND (${cleanedQuery})`
    : topicObj.query;
}

function buildDateFilter(dateRange) {
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
  return dateFilter;
}

async function fetchPubMedCount(searchTerm, dates = {}) {
  const dateFilter = dates.mindate
    ? `&datetype=pdat&mindate=${dates.mindate}&maxdate=${dates.maxdate}`
    : '';
  const searchUrl = `${PUBMED_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(searchTerm)}&retmax=0&retmode=json${dateFilter}`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error('PubMed search is not available right now. Please try again in a moment.');
  const searchData = await searchRes.json();
  return Number(searchData.esearchresult?.count || 0);
}

export async function fetchAbstract(pmid) {
  const url = `${PUBMED_BASE}/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=text`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Abstract not available.');
  return res.text();
}

// Generate audience-appropriate summary from abstract text
export function generateSummary(abstract, audience) {
  if (!abstract || abstract.length < 50) return null;

  // Extract key sentences heuristically
  const sentences = abstract.split(/(?<=[.!?])\s+/).filter(s => s.length > 30);

  if (audience === 'parent') {
    const parentPoints = extractKeyPoints(sentences, 3).map(makePlainLanguage);
    return {
      headline: 'Plain-language takeaways',
      points: parentPoints,
      note: 'This is a research snapshot, not medical advice. Your child\'s oncology team can explain whether it applies to your child.',
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

function makePlainLanguage(sentence) {
  return sentence
    .replace(/\bpaediatric\b/gi, 'pediatric')
    .replace(/\bneoplasm(s)?\b/gi, 'cancer$1')
    .replace(/\bmalignanc(y|ies)\b/gi, 'cancer')
    .replace(/\badverse events?\b/gi, 'side effects')
    .replace(/\boverall survival\b/gi, 'how many children were alive after a set time')
    .replace(/\bprogression-free survival\b/gi, 'how long the cancer stayed from getting worse')
    .replace(/\befficacy\b/gi, 'how well it worked')
    .replace(/\btoxicity\b/gi, 'side effects')
    .replace(/\bcohort\b/gi, 'group of patients')
    .replace(/\bprognosis\b/gi, 'likely course')
    .replace(/\btherapeutic\b/gi, 'treatment')
    .replace(/\butili[sz]e(d|s)?\b/gi, 'use$1');
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
