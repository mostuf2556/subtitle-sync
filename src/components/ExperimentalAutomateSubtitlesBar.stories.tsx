import type { Meta, StoryObj } from "@storybook/react";
import { ExperimentalAutomateSubtitlesBar } from "./ExperimentalAutomateSubtitlesBar";

const meta: Meta<typeof ExperimentalAutomateSubtitlesBar> = {
  title: "Experimental/ExperimentalAutomateSubtitlesBar",
  component: ExperimentalAutomateSubtitlesBar,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ExperimentalAutomateSubtitlesBar>;

export const Default: Story = {
  args: {
    activeLanguage: "en",
    availableLanguages: ["en", "es", "he"],
    onSwitchSubtitleLanguage: (lang) => {
      console.log("Switch subtitles to:", lang);
    },
  },
};

export const RussianSelected: Story = {
  args: {
    activeLanguage: "ru",
    availableLanguages: ["ru", "ar", "en"],
    onSwitchSubtitleLanguage: (lang) => {
      console.log("Switch subtitles to:", lang);
    },
  },
};
