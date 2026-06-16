import { describe, it, expect } from 'vitest';
import { resolveAiUsageDisclaimer, aiUsageDisclaimerDefaults } from './aiUsageDisclaimer';

describe('resolveAiUsageDisclaimer', () => {
  it('applies per-language defaults when frontmatter provides nothing', () => {
    const result = resolveAiUsageDisclaimer('ru', {});
    expect(result.aiUsageDisclaimer).toBe(aiUsageDisclaimerDefaults.ru?.aiUsageDisclaimer);
    expect(result.aiUsageDisclaimerShowLeaveButton).toBe(false);
    expect(result.aiUsageDisclaimerShowAcceptButton).toBe(false);
  });

  it('lets frontmatter override the default text and buttons', () => {
    const result = resolveAiUsageDisclaimer('en', {
      aiUsageDisclaimer: 'Custom disclaimer text',
      aiUsageDisclaimerShowLeaveButton: false,
    });
    expect(result.aiUsageDisclaimer).toBe('Custom disclaimer text');
    expect(result.aiUsageDisclaimerShowLeaveButton).toBe(false);
    // Untouched fields keep falling back to the language defaults.
    expect(result.aiUsageDisclaimerShowAcceptButton).toBe(true);
  });

  it('lets a post opt out of the disclaimer with an empty string', () => {
    const result = resolveAiUsageDisclaimer('en', { aiUsageDisclaimer: '' });
    expect(result.aiUsageDisclaimer).toBe('');
  });
});
