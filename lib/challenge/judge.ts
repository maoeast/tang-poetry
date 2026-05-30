const ANSWER_NORMALIZE_PATTERN = /[，。！？；：、,.!?;:\s]/g;

export function normalizeAnswer(text: string) {
  return text.replace(ANSWER_NORMALIZE_PATTERN, "").trim();
}

export function judgeCouplet(userAnswer: string, expected: string) {
  return normalizeAnswer(userAnswer) === normalizeAnswer(expected);
}

export function judgeAuthor(userAnswer: string, expected: string) {
  return normalizeAnswer(userAnswer) === normalizeAnswer(expected);
}

export function judgeTitle(userAnswer: string, expected: string) {
  return normalizeAnswer(userAnswer) === normalizeAnswer(expected);
}

export function judgeOrdering(userAnswer: string[], expected: string[]) {
  if (userAnswer.length !== expected.length) {
    return false;
  }

  return userAnswer.every((line, index) => {
    return normalizeAnswer(line) === normalizeAnswer(expected[index] ?? "");
  });
}
