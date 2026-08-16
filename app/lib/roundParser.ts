/**
 * Parses funding round type from evidence description.
 * Only extracts explicit mentions - never infers or guesses.
 *
 * Returns: 'Pre-Seed' | 'Seed' | 'Series A' | ... | 'IPO' | null
 */
export function parseRoundType(description: string): string | null {
  if (!description) return null;

  const lower = description.toLowerCase();

  // Check in order of specificity (F before E before D, etc.)
  // This prevents "Series B" from matching "Series" in "Series B extension"
  if (lower.includes('series f') || lower.includes('series-f')) return 'Series F';
  if (lower.includes('series e') || lower.includes('series-e')) return 'Series E';
  if (lower.includes('series d') || lower.includes('series-d')) return 'Series D';
  if (lower.includes('series c') || lower.includes('series-c')) return 'Series C';
  if (lower.includes('series b') || lower.includes('series-b')) return 'Series B';
  if (lower.includes('series a') || lower.includes('series-a')) return 'Series A';

  if (lower.includes('pre-seed') || lower.includes('preseed')) return 'Pre-Seed';
  if (lower.includes('seed')) return 'Seed';

  if (lower.includes('ipo') || lower.includes('initial public offering')) return 'IPO';

  // No explicit round type found
  return null;
}

/**
 * Gets a display label for funding evidence.
 * If round type is known, shows it. Otherwise shows generic label.
 */
export function getRoundLabel(roundType: string | null, value: string | null): string {
  if (roundType) {
    return value ? `${roundType} - ${value}` : roundType;
  }
  return value ? `Funding - ${value}` : 'Funding Event';
}

/**
 * Gets the stage order for sorting (earlier stages first).
 * Lower numbers = earlier stage.
 */
export function getRoundStageOrder(roundType: string | null): number {
  switch (roundType) {
    case 'Pre-Seed': return 1;
    case 'Seed': return 2;
    case 'Series A': return 3;
    case 'Series B': return 4;
    case 'Series C': return 5;
    case 'Series D': return 6;
    case 'Series E': return 7;
    case 'Series F': return 8;
    case 'IPO': return 9;
    default: return 99; // Unspecified rounds go last
  }
}

/**
 * Gets color for funding round visualization.
 * Earlier stages = lighter, later stages = darker.
 */
export function getRoundColor(roundType: string | null): string {
  switch (roundType) {
    case 'Pre-Seed':
    case 'Seed':
      return '#8B95A1'; // Gray - early stage
    case 'Series A':
    case 'Series B':
      return '#C9A227'; // Gold - growth stage
    case 'Series C':
    case 'Series D':
      return '#3FBF7F'; // Green - mature stage
    case 'Series E':
    case 'Series F':
      return '#0EA5E9'; // Blue - late stage
    case 'IPO':
      return '#8B5CF6'; // Purple - public
    default:
      return '#5A6470'; // Dark gray - unspecified
  }
}
