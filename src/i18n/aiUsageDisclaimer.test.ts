import { describe, it, expect } from 'vitest';
import { resolveAiUsageDisclaimer, aiUsageDisclaimerDefaults } from './aiUsageDisclaimer';

describe('resolveAiUsageDisclaimer', () => {
  it('shows nothing when frontmatter provides nothing', () => {
    const result = resolveAiUsageDisclaimer('ru', {});
    expect(result.aiUsageDisclaimer).toBeUndefined();
    expect(result.aiUsageDisclaimerShowLeaveButton).toBe(false);
    expect(result.aiUsageDisclaimerShowAcceptButton).toBe(false);
  });

  it('opts into the language default with `true`', () => {
    const result = resolveAiUsageDisclaimer('en', { aiUsageDisclaimer: true });
    expect(result.aiUsageDisclaimer).toBe(aiUsageDisclaimerDefaults.en?.aiUsageDisclaimer);
    expect(result.aiUsageDisclaimerShowAcceptButton).toBe(true);
    expect(result.aiUsageDisclaimerAcceptButtonText).toBe('I accept that');
    expect(result.aiUsageDisclaimerShowLeaveButton).toBe(true);
  });

  it('opts into the language default for russian too', () => {
    const result = resolveAiUsageDisclaimer('ru', { aiUsageDisclaimer: true });
    expect(result.aiUsageDisclaimer).toBe(aiUsageDisclaimerDefaults.ru?.aiUsageDisclaimer);
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

  it('hides the disclaimer with an empty string or `false`', () => {
    for (const value of ['', false] as const) {
      const off = resolveAiUsageDisclaimer('en', { aiUsageDisclaimer: value });
      expect(off.aiUsageDisclaimer).toBeUndefined();
      expect(off.aiUsageDisclaimerShowAcceptButton).toBe(false);
      expect(off.aiUsageDisclaimerShowLeaveButton).toBe(false);
    }
  });
});
