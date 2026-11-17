function normalizeAnswer(value: string): string {
  return value.normalize('NFKC').toLowerCase().trim().replace(/\s+/gu, ' ');
}

export function gradeAnswer(answer: string, expected: string): boolean | null {
  const target = normalizeAnswer(expected);
  return target ? normalizeAnswer(answer) === target : null;
}

export function submitsAnswer(
  event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey' | 'isComposing' | 'keyCode' | 'repeat'>,
  composing: boolean,
): boolean {
  return event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.ctrlKey &&
    !event.metaKey && !event.isComposing && !composing && event.keyCode !== 229 && !event.repeat;
}
