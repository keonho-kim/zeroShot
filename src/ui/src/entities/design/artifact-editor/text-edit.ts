export function nextTextFromKey(currentText: string, key: string): string {
  if (key === "Backspace") {
    return currentText.slice(0, -1);
  }
  if (key === "Enter") {
    return `${currentText}\n`;
  }
  if (key.length === 1) {
    return `${currentText}${key}`;
  }
  return currentText;
}

export function translatedStyle(style: string | undefined, deltaX: number, deltaY: number): string {
  const match = /translate\(\s*(-?\d+(?:\.\d+)?)px(?:,\s*|\s+)(-?\d+(?:\.\d+)?)px\s*\)/.exec(style ?? "");
  const x = Math.round((match ? Number(match[1]) : 0) + deltaX);
  const y = Math.round((match ? Number(match[2]) : 0) + deltaY);
  return `translate(${x}px, ${y}px)`;
}
