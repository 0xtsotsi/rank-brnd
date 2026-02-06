/**
 * Readability Analysis
 *
 * Calculates Flesch-Kincaid readability scores for content.
 */

import type { ReadabilityAnalysis } from './types';

/**
 * Count the number of syllables in a word
 * Uses a simplified syllable counting algorithm
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().trim();
  if (word.length <= 3) return 1;

  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const matches = word.match(/[aeiouy]{1,2}/g);

  return matches ? Math.max(1, matches.length) : 1;
}

/**
 * Count syllables in a text
 */
function countTotalSyllables(text: string): number {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  return words.reduce((total, word) => total + countSyllables(word), 0);
}

/**
 * Count sentences in text
 */
function countSentences(text: string): number {
  // Split by sentence endings, but handle abbreviations and decimals
  const sentences = text
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0)
    .filter((s) => /\b[a-zA-Z]{2,}/.test(s.trim())); // Must contain at least one word

  return Math.max(1, sentences.length);
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  const matches = text.match(/\b\w+\b/g);
  return matches ? matches.length : 0;
}

/**
 * Calculate Flesch-Kincaid Grade Level
 * Formula: 0.39 * (total words / total sentences) + 11.8 * (total syllables / total words) - 15.59
 */
export function calculateFleschKincaidGrade(text: string): number {
  const wordCount = countWords(text);
  const sentenceCount = countSentences(text);
  const syllableCount = countTotalSyllables(text);

  if (wordCount === 0 || sentenceCount === 0) return 0;

  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;

  const gradeLevel =
    0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;

  return Math.max(0, Math.min(20, gradeLevel)); // Clamp between 0 and 20
}

/**
 * Calculate Flesch Reading Ease Score
 * Formula: 206.835 - 1.015 * (total words / total sentences) - 84.6 * (total syllables / total words)
 * Score 0-100: higher = easier to read
 */
export function calculateFleschReadingEase(text: string): number {
  const wordCount = countWords(text);
  const sentenceCount = countSentences(text);
  const syllableCount = countTotalSyllables(text);

  if (wordCount === 0 || sentenceCount === 0) return 0;

  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;

  const score =
    206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

  return Math.max(0, Math.min(100, score)); // Clamp between 0 and 100
}

/**
 * Analyze readability of content
 */
export function analyzeReadability(
  content: string,
  options: {
    targetGradeMin?: number;
    targetGradeMax?: number;
  } = {}
): ReadabilityAnalysis {
  const targetGradeMin = options.targetGradeMin ?? 8;
  const targetGradeMax = options.targetGradeMax ?? 10;

  const wordCount = countWords(content);
  const sentenceCount = countSentences(content);
  const syllableCount = countTotalSyllables(content);

  const fleschKincaidGrade = calculateFleschKincaidGrade(content);
  const fleschKincaidScore = calculateFleschReadingEase(content);

  const avgSentenceLength = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / Math.max(1, wordCount);

  const targetGradeMet =
    fleschKincaidGrade >= targetGradeMin &&
    fleschKincaidGrade <= targetGradeMax;

  // Calculate score based on how close we are to target grade
  let score = 0;
  if (targetGradeMet) {
    // Perfect score if within target range
    score = 100;
  } else {
    // Deduct points based on distance from target range
    const distance = Math.min(
      Math.abs(fleschKincaidGrade - targetGradeMin),
      Math.abs(fleschKincaidGrade - targetGradeMax)
    );
    score = Math.max(0, 100 - distance * 10);
  }

  return {
    fleschKincaidGrade: Math.round(fleschKincaidGrade * 10) / 10,
    fleschKincaidScore: Math.round(fleschKincaidScore),
    targetGrade: targetGradeMax,
    targetGradeMet,
    sentenceCount,
    wordCount,
    avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
    score,
  };
}

/**
 * Get reading level description from Flesch-Kincaid grade
 */
export function getReadingLevelDescription(grade: number): string {
  if (grade <= 5) return 'Elementary School (5th grade or lower)';
  if (grade <= 8) return 'Middle School (6-8th grade)';
  if (grade <= 12) return 'High School (9-12th grade)';
  if (grade <= 16) return 'College Level';
  return 'Professional/Academic';
}

/**
 * Get readability assessment from Flesch Reading Ease score
 */
export function getReadabilityAssessment(score: number): string {
  if (score >= 90) return 'Very Easy (5th grade)';
  if (score >= 80) return 'Easy (6th grade)';
  if (score >= 70) return 'Fairly Easy (7th grade)';
  if (score >= 60) return 'Standard (8-9th grade)';
  if (score >= 50) return 'Fairly Difficult (10-12th grade)';
  if (score >= 30) return 'Difficult (College)';
  return 'Very Difficult (Professional)';
}
