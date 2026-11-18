import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ListeningGamePanel, type ListeningGamePanelProps } from "./ListeningGamePanel";

const SAMPLE_ROWS = [
  {
    texts: {
      en: "Hello world! Welcome to language immersion.",
      es: "¡Hola mundo! Bienvenidos a la inmersión lingüística.",
      he: "שלום עולם! ברוכים הבאים לטבילת השפה.",
    },
  },
  {
    texts: {
      en: "Short phrases help you focus. Longer grammatical sentences build strong comprehension skills every day.",
      es: "Las frases cortas te ayudan a concentrarte. Las oraciones gramaticales más largas desarrollan habilidades sólidas.",
      he: "משפטים קצרים עוזרים לך להתמקד. משפטים דקדוקיים ארוכים יותר בונים הבנה חזקה.",
    },
  },
  {
    texts: {
      en: "Listen carefully. Repeat aloud!",
      es: "Escucha atentamente. ¡Repite en voz alta!",
      he: "הקשב היטב. חזור בקול!",
    },
  },
];

const meta: Meta<typeof ListeningGamePanel> = {
  title: "Components/ListeningGamePanel",
  component: ListeningGamePanel,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Interactive Listening Game supporting With/Without Translations mode for subtitle words (min letters filter, click or swipe left/right to archive & unquarantine, OpenRouter sentence generation from the active words list) and punctuation-based sentences (max X words filter).",
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ListeningGamePanel>;

const StoryWrapper: React.FC<Partial<ListeningGamePanelProps>> = (props) => {
  const [lastSpoken, setLastSpoken] = useState<string>("");

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-3">
      <ListeningGamePanel
        rows={SAMPLE_ROWS}
        baseLanguage="en"
        baseLanguageName="English"
        targetLanguage="es"
        targetLanguageName="Spanish"
        availableLanguages={[
          { code: "en", name: "English" },
          { code: "es", name: "Spanish" },
          { code: "he", name: "Hebrew" },
        ]}
        configuredRates={{ en: 1.0, es: 0.9, he: 0.85 }}
        onSpeakText={(text, lang, options) =>
          setLastSpoken(
            `[${lang}${options?.rateOverride ? ` @ ${options.rateOverride}x` : ""}] ${text}`,
          )
        }
        onCreateSentencesWithOpenRouter={(words) =>
          setLastSpoken(`[OpenRouter] Generate 5x sentences for: ${words.slice(0, 6).join(", ")}`)
        }
        {...props}
      />
      {lastSpoken && (
        <div className="text-xs font-mono text-muted-foreground border border-border rounded px-3 py-1.5 bg-muted/30">
          Last action: {lastSpoken}
        </div>
      )}
    </div>
  );
};

export const WithTranslations: Story = {
  render: () => <StoryWrapper initialWithTranslations={true} />,
};

export const WithoutTranslations: Story = {
  render: () => (
    <StoryWrapper initialWithTranslations={false} initialMinLetters={5} initialMaxWords={5} />
  ),
};
