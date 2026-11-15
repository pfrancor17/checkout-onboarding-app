/** Gateway messages may come without a final period. */
export const asSentence = (text: string) =>
  /[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`;
