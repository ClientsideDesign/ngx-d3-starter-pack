import { Component } from '@angular/core';
import { LabelledChartData, DatedChartDataGroups, TerritoryData, VennDiagramSet } from './charts/chart-interfaces';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  newCustomers: DatedChartDataGroups =
    {
      groups: {
        website: {
          label: 'Website',
          values: [2, 3, 4, 3, 6, 7],
          unit: 'Users',
          secondAxis: false
        },
        app: {
          label: 'App',
          values: [20, 22, 22, 23, 29, 29],
          unit: 'Users',
          secondAxis: true
        }
      },
      dates: ['2020-03-29',
        '2020-04-05',
        '2020-04-12',
        '2020-04-19',
        '2020-04-26',
        '2020-05-03']
    };

  revenue: DatedChartDataGroups =
    {
      groups: {
        emailGrowth: {
          label: 'CDs',
          values: [100, 120, 150, 120, 80, 90],
          unit: '£',
          secondAxis: false
        },
        smsGrowth: {
          label: 'DVDs',
          values: [60, 50, 90, 70, 125, 130],
          unit: '£',
          secondAxis: false
        }
      },
      dates: ['2020-03-29',
        '2020-04-05',
        '2020-04-12',
        '2020-04-19',
        '2020-04-26',
        '2020-05-03']
    };

  ageData: LabelledChartData[] = [
    { value: 1200, label: '13-17' },
    { value: 1600, label: '18-24' },
    { value: 2000, label: '25-34' },
    { value: 1000, label: '35-44' },
    { value: 400, label: '45-59' },
    { value: 100, label: '60+' }
  ];

  genderData: LabelledChartData[] = [
    { value: 2000, label: 'Male' },
    { value: 3000, label: 'Female' },
    { value: 1200, label: 'Unknown' }
  ];

  vennData: VennDiagramSet[] = [
    { sets: ['websiteUsers'], size: 10000, label: 'Website Users' },
    { sets: ['purchasers'], size: 4000, label: 'Purchasers' },
    { sets: ['appUsers'], size: 6000, label: 'App Users' },
    { sets: ['websiteUsers', 'purchasers'], size: 2100 },
    { sets: ['websiteUsers', 'appUsers'], size: 1600 },
    { sets: ['purchasers', 'appUsers'], size: 1100 },
    { sets: ['websiteUsers', 'purchasers', 'appUsers'], size: 500 },
  ];

  populationData: TerritoryData[] = [
    { id: 124, value: 2000 },
    { id: 826, value: 1000 },
    { id: 840, value: 500 },
  ];
}
