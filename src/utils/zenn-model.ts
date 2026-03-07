import { type ValidationError, validateArticle } from 'zenn-model';
import { parseFrontmatter } from '../frontmatter/frontmatter';

type ZennModelValidationInput = {
  frontmatter: string;
  bodyHtml: string;
  documentName: string;
};

export type ZennModelValidationResult = {
  errors: ValidationError[];
  criticalCount: number;
  warningCount: number;
  isValid: boolean;
  summaryLabel: string;
};

const getFileSlug = (documentName: string) => {
  const withoutExt = documentName.replace(/\.md$/i, '').trim();
  if (!withoutExt) return 'untitled-file';
  return withoutExt;
};

const readScalar = (yaml: string, key: string) => {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = yaml.match(new RegExp(`^${escapedKey}:\\s*(.+)$`, 'm'));
  if (!match) return undefined;

  const raw = match[1].trim();
  if (!raw) return undefined;

  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }

  return raw;
};

const toArticleValidationTarget = ({
  frontmatter,
  bodyHtml,
  documentName,
}: ZennModelValidationInput) => {
  const parsed = parseFrontmatter(frontmatter);
  const slug = getFileSlug(documentName);

  return {
    slug,
    title: parsed.title,
    emoji: parsed.emoji,
    type: parsed.type,
    topics: parsed.topics,
    published: parsed.published,
    publication_name: readScalar(frontmatter, 'publication_name'),
    published_at: readScalar(frontmatter, 'published_at'),
    bodyHtml,
  };
};

export const validateWithZennModel = (
  input: ZennModelValidationInput,
): ZennModelValidationResult => {
  const target = toArticleValidationTarget(input);
  const errors = validateArticle(target);
  const criticalCount = errors.filter((error) => error.isCritical).length;
  const warningCount = errors.length - criticalCount;

  let summaryLabel = 'zenn-model: OK';
  if (criticalCount > 0 || warningCount > 0) {
    const chunks: string[] = [];
    if (criticalCount > 0) {
      chunks.push(`${criticalCount} critical`);
    }
    if (warningCount > 0) {
      chunks.push(`${warningCount} warning`);
    }
    summaryLabel = `zenn-model: ${chunks.join(', ')}`;
  }

  return {
    errors,
    criticalCount,
    warningCount,
    isValid: errors.length === 0,
    summaryLabel,
  };
};
