import rawData from "../swot-data.json";

type SwotData = {
  version: string;
  domains: Record<string, string>;
  stoplist: string[];
  abused: string[];
  tlds: string[];
};

type MatchKind = "domain" | "tld";

export type StudentDomainMatch = {
  domain: string;
  normalizedDomain: string;
  schoolName: string | null;
  kind: MatchKind;
  isAcademic: boolean;
  isAbused: boolean;
  isStoplisted: boolean;
};

const data = rawData as SwotData;
const domainMap = data.domains;
const tldSet = new Set(data.tlds.map(normalizeDomain));
const stoplistSet = new Set(data.stoplist.map(normalizeDomain));
const abusedSet = new Set(data.abused.map(normalizeDomain));

export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^[^@]+@/, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

export function extractDomain(input: string): string {
  const domain = normalizeDomain(input);

  if (!domain || !domain.includes(".")) {
    return "";
  }

  return domain;
}

function getDomainCandidates(domain: string): string[] {
  const parts = domain.split(".");
  const candidates: string[] = [];

  for (let index = 0; index < parts.length - 1; index += 1) {
    candidates.push(parts.slice(index).join("."));
  }

  return candidates;
}

function getFirstMatch(set: Set<string>, candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (set.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function getSchoolMatch(candidates: string[]): { domain: string; schoolName: string } | null {
  for (const candidate of candidates) {
    const schoolName = domainMap[candidate];

    if (schoolName) {
      return { domain: candidate, schoolName };
    }
  }

  return null;
}

export function findStudentDomain(input: string): StudentDomainMatch | null {
  const normalizedDomain = extractDomain(input);

  if (!normalizedDomain) {
    return null;
  }

  const candidates = getDomainCandidates(normalizedDomain);
  const matchedStoplist = getFirstMatch(stoplistSet, candidates);
  const matchedAbused = getFirstMatch(abusedSet, candidates);
  const matchedSchool = getSchoolMatch(candidates);
  const matchedTld = getFirstMatch(tldSet, candidates);

  if (!matchedSchool && !matchedTld) {
    return null;
  }

  return {
    domain: matchedSchool?.domain ?? matchedTld!,
    normalizedDomain,
    schoolName: matchedSchool?.schoolName ?? null,
    kind: matchedSchool ? "domain" : "tld",
    isAcademic: !matchedStoplist && (!!matchedSchool || !!matchedTld),
    isAbused: Boolean(matchedAbused),
    isStoplisted: Boolean(matchedStoplist),
  };
}

export function isStudentEmail(input: string): boolean {
  const match = findStudentDomain(input);
  return Boolean(match?.isAcademic && !match.isAbused);
}

export function findInstitutionByEmail(input: string): string | null {
  return findStudentDomain(input)?.schoolName ?? null;
}

export function getSwotVersion(): string {
  return data.version;
}
