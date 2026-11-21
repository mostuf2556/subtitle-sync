import type { Meta, StoryObj } from "@storybook/react";
import { PerformanceLevelGraphWidget } from "./PerformanceLevelGraphWidget";
import type { PerfSample } from "@/utils/performanceTelemetry";

const mockSmoothSamples: PerfSample[] = Array.from({ length: 24 }, (_, idx) => ({
  timestamp: Date.now() - (24 - idx) * 250,
  fps: idx % 7 === 0 ? 54 : 60,
  frameMs: idx % 7 === 0 ? 18.5 : 16.6,
  peakFrameMs: idx % 7 === 0 ? 22 : 17.5,
  longTasks: 0,
}));

const mockDegradedSamples: PerfSample[] = Array.from({ length: 24 }, (_, idx) => ({
  timestamp: Date.now() - (24 - idx) * 250,
  fps: idx > 12 ? 24 : 58,
  frameMs: idx > 12 ? 41.2 : 17.1,
  peakFrameMs: idx > 12 ? 68 : 20,
  longTasks: idx > 12 ? 2 : 0,
}));

const meta: Meta<typeof PerformanceLevelGraphWidget> = {
  title: "Components/PerformanceLevelGraphWidget",
  component: PerformanceLevelGraphWidget,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    isOpen: true,
    onClose: () => {},
    initialPosition: { x: 24, y: 24 },
  },
};

export default meta;
type Story = StoryObj<typeof PerformanceLevelGraphWidget>;

export const Smooth60Fps: Story = {
  args: {
    initialSamples: mockSmoothSamples,
  },
};

export const OptionDefectionSpike: Story = {
  args: {
    initialSamples: mockDegradedSamples,
  },
};
