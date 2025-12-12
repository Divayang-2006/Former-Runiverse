const uniqueKeywords = (values: Array<string | null | undefined>): string[] => {
  const keywords = new Set<string>();

  values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .forEach((value) => {
      const normalized = value.trim().toLowerCase();
      keywords.add(normalized);
      normalized.split(/\s+/).forEach((segment) => {
        if (segment.length > 0) {
          keywords.add(segment);
        }
      });
    });

  return Array.from(keywords);
};

export const buildUserSearchKeywords = (...values: Array<string | null | undefined>): string[] => uniqueKeywords(values);
