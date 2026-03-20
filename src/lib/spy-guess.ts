import Fuse from 'fuse.js';

/**
 * Нормализация текста для сравнения угадывания локации шпионом.
 * - нижний регистр
 * - Ё → Е
 * - удаление знаков препинания и лишних пробелов
 */
export function normalizeForGuess(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const WORD_MATCH_THRESHOLD = 0.5; // макс. «ошибка» 50% по Fuse на слово (score 0 = идеально, 0.5 = порог)

/**
 * Для авто-вина: слов в догадке не меньше, чем в локации; каждое слово локации
 * должно совпасть с каким-то словом догадки с ошибкой не больше 50% (Fuse score <= 0.5).
 * Каждое слово догадки используется не более одного раза.
 * Пример: "церемония свадьбы" ↔ "Свадебная церемония" — оба слова находятся (свадебная↔свадьбы, церемония↔церемония).
 */
function everyLocationWordMatchesWithLowError(
  locationWords: string[],
  guessWords: string[],
): boolean {
  if (guessWords.length < locationWords.length) return false;
  const used = new Set<number>();

  for (const locWord of locationWords) {
    let bestScore = 1;
    let bestIdx = -1;
    for (let j = 0; j < guessWords.length; j++) {
      if (used.has(j)) continue;
      const fuse = new Fuse([guessWords[j]], {
        includeScore: true,
        threshold: WORD_MATCH_THRESHOLD,
        ignoreLocation: true,
      });
      const results = fuse.search(locWord);
      const score = results[0]?.score ?? 1;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = j;
      }
    }
    if (bestIdx === -1 || bestScore > WORD_MATCH_THRESHOLD) return false;
    used.add(bestIdx);
  }
  return true;
}

/**
 * Проверка угадывания локации: авто-вин только если шпион назвал столько же слов,
 * и в каждом слове ошибка не больше 50% (по Fuse).
 * Оба аргумента нормализуются; порядок слов не важен.
 */
export function isSpyGuessMatch(guess: string, locationName: string): boolean {
  const g = normalizeForGuess(guess);
  const loc = normalizeForGuess(locationName);
  if (!g || !loc) return false;

  const locationWords = loc.split(/\s+/).filter(Boolean);
  const guessWords = g.split(/\s+/).filter(Boolean);

  if (locationWords.length === 0) return true;
  if (guessWords.length < locationWords.length) return false;

  return everyLocationWordMatchesWithLowError(locationWords, guessWords);
}
