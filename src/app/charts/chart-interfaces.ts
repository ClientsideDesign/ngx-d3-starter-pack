export interface LabelledChartData {
  label: string;
  value: number;
}

export interface DatedChartDataGroup {
  [prop: string]: DatedChartDataValue;
}

export interface DatedChartDataValue {
  label: string;
  values: number[];
  secondAxis: boolean;
  unit?: string;
}

export interface DatedChartDataGroups {
  groups: DatedChartDataGroup;
  dates: string[];
}

export interface TerritoryData {
  id: number;
  value: number;
  name?: string; /* Added as the chart is rendered */
}

export interface VennDiagramSet {
  sets: string[];
  size: number;
  label?: string;
}

// For world map:

export interface GeometryProperties {
  name: string;
  value: number;
}
