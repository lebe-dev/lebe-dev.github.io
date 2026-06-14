import type { Lang } from "./ui";

export interface AiUsageDisclaimerSettings {
  aiUsageDisclaimer?: string;
  aiUsageDisclaimerShowLeaveButton?: boolean;
  aiUsageDisclaimerLeaveButtonText?: string;
  aiUsageDisclaimerShowAcceptButton?: boolean;
  aiUsageDisclaimerAcceptButtonText?: string;
}

// Per-language defaults, applied to every post in that language folder
// unless the post's own frontmatter overrides a field.
// To opt a single post out of a default, set the field explicitly
// (e.g. `aiUsageDisclaimer: ""`).
export const aiUsageDisclaimerDefaults: Partial<
  Record<Lang, AiUsageDisclaimerSettings>
> = {
  ru: {
    aiUsageDisclaimer:
      "Текст полностью написан взрослым и живым человеком. Так как это авторский блог, то я не могу гарантировать, что моё мнение может совпасть с вашим.",
  },
  en: {
    aiUsageDisclaimer:
      "This article was written by a russian speaker and translated with LLM into English. \nIf you cannot accept that fact and feel unsafe, choose your side:",
    aiUsageDisclaimerShowAcceptButton: true,
    aiUsageDisclaimerAcceptButtonText: "I accept that",
    aiUsageDisclaimerShowLeaveButton: true,
    aiUsageDisclaimerLeaveButtonText: "I want to leave",
  },
  es: {
    aiUsageDisclaimer:
      "Este artículo fue escrito por una persona de habla rusa y traducido al español con LLM.\nSi no puedes aceptar este hecho y te sientes inseguro, elige tu bando:",
    aiUsageDisclaimerShowAcceptButton: true,
    aiUsageDisclaimerAcceptButtonText: "Lo acepto",
    aiUsageDisclaimerShowLeaveButton: true,
    aiUsageDisclaimerLeaveButtonText: "Quiero irme",
  },
  zh: {
    aiUsageDisclaimer:
      "这篇文章由一位俄语使用者撰写，并使用LLM翻译成中文。\n如果你无法接受这个事实并感到不安，请选择你的立场：",
    aiUsageDisclaimerShowAcceptButton: true,
    aiUsageDisclaimerAcceptButtonText: "我接受",
    aiUsageDisclaimerShowLeaveButton: true,
    aiUsageDisclaimerLeaveButtonText: "我想离开",
  },
  ja: {
    aiUsageDisclaimer:
      "この記事はロシア語を話す人によって書かれ、LLMで日本語に翻訳されました。\nこの事実を受け入れられず不安を感じる場合は、どちらかを選んでください：",
    aiUsageDisclaimerShowAcceptButton: true,
    aiUsageDisclaimerAcceptButtonText: "受け入れます",
    aiUsageDisclaimerShowLeaveButton: true,
    aiUsageDisclaimerLeaveButtonText: "離れたいです",
  },
  fr: {
    aiUsageDisclaimer:
      "Cet article a été écrit par une personne russophone et traduit en français avec un LLM.\nSi vous ne pouvez pas accepter ce fait et vous sentez en insécurité, choisissez votre camp :",
    aiUsageDisclaimerShowAcceptButton: true,
    aiUsageDisclaimerAcceptButtonText: "J'accepte",
    aiUsageDisclaimerShowLeaveButton: true,
    aiUsageDisclaimerLeaveButtonText: "Je veux partir",
  },
  de: {
    aiUsageDisclaimer:
      "Dieser Artikel wurde von einem russischsprachigen Menschen geschrieben und mit einem LLM ins Deutsche übersetzt.\nWenn du diese Tatsache nicht akzeptieren kannst und dich unwohl fühlst, wähle deine Seite:",
    aiUsageDisclaimerShowAcceptButton: true,
    aiUsageDisclaimerAcceptButtonText: "Ich akzeptiere das",
    aiUsageDisclaimerShowLeaveButton: true,
    aiUsageDisclaimerLeaveButtonText: "Ich möchte gehen",
  },
};

export const resolveAiUsageDisclaimer = (
  lang: Lang,
  data: AiUsageDisclaimerSettings,
): Required<Omit<AiUsageDisclaimerSettings, "aiUsageDisclaimer">> &
  Pick<AiUsageDisclaimerSettings, "aiUsageDisclaimer"> => {
  const defaults = aiUsageDisclaimerDefaults[lang] ?? {};
  return {
    aiUsageDisclaimer: data.aiUsageDisclaimer ?? defaults.aiUsageDisclaimer,
    aiUsageDisclaimerShowLeaveButton:
      data.aiUsageDisclaimerShowLeaveButton ??
      defaults.aiUsageDisclaimerShowLeaveButton ??
      false,
    aiUsageDisclaimerLeaveButtonText:
      data.aiUsageDisclaimerLeaveButtonText ??
      defaults.aiUsageDisclaimerLeaveButtonText ??
      "",
    aiUsageDisclaimerShowAcceptButton:
      data.aiUsageDisclaimerShowAcceptButton ??
      defaults.aiUsageDisclaimerShowAcceptButton ??
      false,
    aiUsageDisclaimerAcceptButtonText:
      data.aiUsageDisclaimerAcceptButtonText ??
      defaults.aiUsageDisclaimerAcceptButtonText ??
      "",
  };
};
