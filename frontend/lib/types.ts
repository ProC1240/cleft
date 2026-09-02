export type SplitType = "ALL" | "PARTIAL";

export type BillItem = {
  name: string;
  price: number;
  quantity: number;
  note?: string;
};

export type Member = {
  name: string;
  splitType: SplitType;
  itemNames?: string[];
};
