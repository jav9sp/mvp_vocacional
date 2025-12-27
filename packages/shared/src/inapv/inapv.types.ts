export type Dimension = "interes" | "aptitud";

export type InapArea = { key: string; name: string };

export type InapQuestion = {
  id: number;
  text: string;
  area: string;
  dim: Dimension[];
};
