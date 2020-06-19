import { Component, ViewChild, AfterViewInit, OnDestroy, Input } from '@angular/core';
import { WindowResizeService } from '../../services/window-resize.service';
import { select } from 'd3-selection';
import { max } from 'd3-array';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { json } from 'd3-fetch';
import { feature } from 'topojson-client';
import { Subscription } from 'rxjs';
import { TerritoryData, GeometryProperties } from '../chart-interfaces';
import { WorldAtlas } from 'topojson';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})

export class MapComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chart') chart;
  @Input() widthHeightRatio: number;
  @Input() data: TerritoryData[];
  @Input() dataTitle: string;
  populationTotal: number;
  windowResizeSub: Subscription;
  parentWidth = 0;
  windowWidth = 0;
  dataView: 'map' | 'table' = 'map';

  constructor(private windowResizeService: WindowResizeService) { }

  ngAfterViewInit() {
    this.data.sort((a, b) => {
      return b.value - a.value;
    });
    json('assets/map-data/countries-110m-no-antarctica.json').then((mapData: WorldAtlas) => {
      const geometries = mapData.objects.countries.geometries;
      geometries.forEach((geometry) => {
        const countryData = this.data.find(population => population.id === parseInt(geometry.id as string, 10));
        if (countryData) {
          const geometryProperties = geometry.properties as GeometryProperties;
          countryData.name = geometryProperties.name; // Used in table view
          geometryProperties.value = countryData.value;
        }
      });
      this.populationTotal = this.data.map(datum => datum.value).reduce((total, value) => total + value);
      this.windowResizeSub = this.windowResizeService.windowSize$.subscribe(resize => {
        if (this.chart && this.chart.nativeElement && this.chart.nativeElement.offsetWidth > 0) {
          if (resize.width !== this.windowWidth) {
            this.windowWidth = resize.width;
            select(this.chart.nativeElement).select('*').remove();
            const checkEmptyInterval = setInterval(() => {
              if (this.chart.nativeElement.children.length === 0) {
                this.drawChart(this.chart.nativeElement.offsetWidth,
                  this.chart.nativeElement.offsetWidth * this.widthHeightRatio, this.chart.nativeElement as HTMLElement, mapData);
                clearInterval(checkEmptyInterval);
              }
            }, 20);
          }
        }
      });
    });
  }

  ngOnDestroy() {
    if (this.windowResizeSub) {
      this.windowResizeSub.unsubscribe();
    }
  }

  drawChart(width: number, height: number, chartWrapper: HTMLElement, mapData: WorldAtlas) {
    const svg = select(chartWrapper)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g');
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseover', () => {
        this.removeTooltips(svg);
      });

    const geojson = feature(mapData, mapData.objects.countries);
    const projection = geoEquirectangular().fitSize([width, height], geojson);
    const path = geoPath().projection(projection);

    svg.selectAll('path')
      .data(geojson.features)
      .join('path')
      .attr('d', path)
      .each((d, i, countries) => {
        const countryArea = select(countries[i]);
        const geometryProperties = d.properties as GeometryProperties;
        if (geometryProperties.value) {
          const populationShare = geometryProperties.value / this.populationTotal;
          countryArea.attr('fill', 'rgb(89, 161, 79)');
          countryArea.attr('opacity', populationShare / 2 + 0.5);
          countryArea.on('mouseover', () => {
            this.addTooltip(svg, geometryProperties.value, populationShare, geometryProperties.name, path.centroid(d), this.dataTitle);
          });
        } else {
          countryArea.attr('fill', '#eeeeee');
          countryArea.on('mouseover', () => {
            this.removeTooltips(svg);
          });
        }
      });
  }

  addTooltip(svg, value, populationShare, countryName, translate, dataTitle) {
    this.removeTooltips(svg);
    // Make sure any old tooltips have been removed first
    const tooltipBackground = svg.append('rect').attr('class', 'tooltip_background');
    const tooltipCountry = svg.append('text').attr('class', 'tooltip_country');
    const tooltipValue = svg.append('text').attr('class', 'tooltip_value');
    const tooltipPadding = 12;

    tooltipCountry
      .style('text-anchor', 'middle')
      .style('fill', '#ffffff')
      .attr('font-family', '"Open Sans", sans-serif')
      .attr('font-size', 10)
      .text(() => countryName)
      .attr('transform', 'translate(' + translate + ')');

    const countryBBox = tooltipCountry.node().getBBox();

    tooltipValue
      .style('text-anchor', 'middle')
      .style('fill', '#ffffff')
      .attr('font-family', '"Open Sans", sans-serif')
      .attr('font-size', 10)
      .text(() => value + ' ' + dataTitle + ' (' + Math.round(populationShare * 100) + '%)')
      .attr('transform', 'translate(' + translate + ')')
      .attr('y', countryBBox.height);

    const valueBBox = tooltipValue.node().getBBox();

    const tooltipDimensions = {
      width: max([countryBBox.width, valueBBox.width]) + tooltipPadding,
      height: countryBBox.height + valueBBox.height + tooltipPadding * 0.6
    };

    tooltipBackground
      .attr('width', tooltipDimensions.width)
      .attr('height', tooltipDimensions.height)
      .attr('transform', 'translate(' + translate + ')')
      .attr('fill', 'rgb(78, 121, 167)')
      .attr('opacity', 0.9)
      .attr('stroke', '#ffffff')
      .style('stroke-width', '1px')
      .attr('x', tooltipDimensions.width * -0.5)
      .attr('y', (tooltipDimensions.height * -0.5) + (tooltipPadding * 0.3))
      .on('mouseout', () => {
        this.removeTooltips(svg);
      });
  }

  removeTooltips(svg) {
    svg.selectAll('.tooltip_value').remove();
    svg.selectAll('.tooltip_country').remove();
    svg.selectAll('.tooltip_background').remove();
  }


}

/*

// For reference

const countryCodes = [
  { id: 4, name: 'Afghanistan' },
  { id: 8, name: 'Albania' },
  { id: 10, name: 'Antarctica' },
  { id: 12, name: 'Algeria' },
  { id: 16, name: 'American Samoa' },
  { id: 20, name: 'Andorra' },
  { id: 24, name: 'Angola' },
  { id: 28, name: 'Antigua and Barbuda' },
  { id: 31, name: 'Azerbaijan' },
  { id: 32, name: 'Argentina' },
  { id: 36, name: 'Australia' },
  { id: 40, name: 'Austria' },
  { id: 44, name: 'Bahamas' },
  { id: 48, name: 'Bahrain' },
  { id: 50, name: 'Bangladesh' },
  { id: 51, name: 'Armenia' },
  { id: 52, name: 'Barbados' },
  { id: 56, name: 'Belgium' },
  { id: 60, name: 'Bermuda' },
  { id: 64, name: 'Bhutan' },
  { id: 68, name: 'Bolivia (Plurinational State of)' },
  { id: 70, name: 'Bosnia and Herzegovina' },
  { id: 72, name: 'Botswana' },
  { id: 74, name: 'Bouvet Island' },
  { id: 76, name: 'Brazil' },
  { id: 84, name: 'Belize' },
  { id: 86, name: 'British Indian Ocean Territory' },
  { id: 90, name: 'Solomon Islands' },
  { id: 92, name: 'Virgin Islands (British)' },
  { id: 96, name: 'Brunei Darussalam' },
  { id: 100, name: 'Bulgaria' },
  { id: 104, name: 'Myanmar' },
  { id: 108, name: 'Burundi' },
  { id: 112, name: 'Belarus' },
  { id: 116, name: 'Cambodia' },
  { id: 120, name: 'Cameroon' },
  { id: 124, name: 'Canada' },
  { id: 132, name: 'Cabo Verde' },
  { id: 136, name: 'Cayman Islands' },
  { id: 140, name: 'Central African Republic' },
  { id: 144, name: 'Sri Lanka' },
  { id: 148, name: 'Chad' },
  { id: 152, name: 'Chile' },
  { id: 156, name: 'China' },
  { id: 158, name: 'Taiwan, Province of China' },
  { id: 162, name: 'Christmas Island' },
  { id: 166, name: 'Cocos (Keeling) Islands' },
  { id: 170, name: 'Colombia' },
  { id: 174, name: 'Comoros' },
  { id: 175, name: 'Mayotte' },
  { id: 178, name: 'Congo' },
  { id: 180, name: 'Congo, Democratic Republic of the' },
  { id: 184, name: 'Cook Islands' },
  { id: 188, name: 'Costa Rica' },
  { id: 191, name: 'Croatia' },
  { id: 192, name: 'Cuba' },
  { id: 196, name: 'Cyprus' },
  { id: 203, name: 'Czechia' },
  { id: 204, name: 'Benin' },
  { id: 208, name: 'Denmark' },
  { id: 212, name: 'Dominica' },
  { id: 214, name: 'Dominican Republic' },
  { id: 218, name: 'Ecuador' },
  { id: 222, name: 'El Salvador' },
  { id: 226, name: 'Equatorial Guinea' },
  { id: 231, name: 'Ethiopia' },
  { id: 232, name: 'Eritrea' },
  { id: 233, name: 'Estonia' },
  { id: 234, name: 'Faroe Islands' },
  { id: 238, name: 'Falkland Islands (Malvinas)' },
  { id: 239, name: 'South Georgia and the South Sandwich Islands' },
  { id: 242, name: 'Fiji' },
  { id: 246, name: 'Finland' },
  { id: 248, name: 'Åland Islands' },
  { id: 250, name: 'France' },
  { id: 254, name: 'French Guiana' },
  { id: 258, name: 'French Polynesia' },
  { id: 260, name: 'French Southern Territories' },
  { id: 262, name: 'Djibouti' },
  { id: 266, name: 'Gabon' },
  { id: 268, name: 'Georgia' },
  { id: 270, name: 'Gambia' },
  { id: 275, name: 'Palestine, State of' },
  { id: 276, name: 'Germany' },
  { id: 288, name: 'Ghana' },
  { id: 292, name: 'Gibraltar' },
  { id: 296, name: 'Kiribati' },
  { id: 300, name: 'Greece' },
  { id: 304, name: 'Greenland' },
  { id: 308, name: 'Grenada' },
  { id: 312, name: 'Guadeloupe' },
  { id: 316, name: 'Guam' },
  { id: 320, name: 'Guatemala' },
  { id: 324, name: 'Guinea' },
  { id: 328, name: 'Guyana' },
  { id: 332, name: 'Haiti' },
  { id: 334, name: 'Heard Island and McDonald Islands' },
  { id: 336, name: 'Holy See' },
  { id: 340, name: 'Honduras' },
  { id: 344, name: 'Hong Kong' },
  { id: 348, name: 'Hungary' },
  { id: 352, name: 'Iceland' },
  { id: 356, name: 'India' },
  { id: 360, name: 'Indonesia' },
  { id: 364, name: 'Iran (Islamic Republic of)' },
  { id: 368, name: 'Iraq' },
  { id: 372, name: 'Ireland' },
  { id: 376, name: 'Israel' },
  { id: 380, name: 'Italy' },
  { id: 384, name: 'Côte d\'Ivoire' },
  { id: 388, name: 'Jamaica' },
  { id: 392, name: 'Japan' },
  { id: 398, name: 'Kazakhstan' },
  { id: 400, name: 'Jordan' },
  { id: 404, name: 'Kenya' },
  { id: 408, name: 'Korea (Democratic People\'s Republic of) ' },
  { id: 410, name: 'Korea, Republic of' },
  { id: 414, name: 'Kuwait' },
  { id: 417, name: 'Kyrgyzstan' },
  { id: 418, name: 'Lao People\'s Democratic Republic' },
  { id: 422, name: 'Lebanon' },
  { id: 426, name: 'Lesotho' },
  { id: 428, name: 'Latvia' },
  { id: 430, name: 'Liberia' },
  { id: 434, name: 'Libya' },
  { id: 438, name: 'Liechtenstein' },
  { id: 440, name: 'Lithuania' },
  { id: 442, name: 'Luxembourg' },
  { id: 446, name: 'Macao' },
  { id: 450, name: 'Madagascar' },
  { id: 454, name: 'Malawi' },
  { id: 458, name: 'Malaysia' },
  { id: 462, name: 'Maldives' },
  { id: 466, name: 'Mali' },
  { id: 470, name: 'Malta' },
  { id: 474, name: 'Martinique' },
  { id: 478, name: 'Mauritania' },
  { id: 480, name: 'Mauritius' },
  { id: 484, name: 'Mexico' },
  { id: 492, name: 'Monaco' },
  { id: 496, name: 'Mongolia' },
  { id: 498, name: 'Moldova, Republic of' },
  { id: 499, name: 'Montenegro' },
  { id: 500, name: 'Montserrat' },
  { id: 504, name: 'Morocco' },
  { id: 508, name: 'Mozambique' },
  { id: 512, name: 'Oman' },
  { id: 516, name: 'Namibia' },
  { id: 520, name: 'Nauru' },
  { id: 524, name: 'Nepal' },
  { id: 528, name: 'Netherlands' },
  { id: 531, name: 'Curaçao' },
  { id: 533, name: 'Aruba' },
  { id: 534, name: 'Sint Maarten (Dutch part)' },
  { id: 535, name: 'Bonaire, Sint Eustatius and Saba' },
  { id: 540, name: 'New Caledonia' },
  { id: 548, name: 'Vanuatu' },
  { id: 554, name: 'New Zealand' },
  { id: 558, name: 'Nicaragua' },
  { id: 562, name: 'Niger' },
  { id: 566, name: 'Nigeria' },
  { id: 570, name: 'Niue' },
  { id: 574, name: 'Norfolk Island' },
  { id: 578, name: 'Norway' },
  { id: 580, name: 'Northern Mariana Islands' },
  { id: 581, name: 'United States Minor Outlying Islands' },
  { id: 583, name: 'Micronesia (Federated States of)' },
  { id: 584, name: 'Marshall Islands' },
  { id: 585, name: 'Palau' },
  { id: 586, name: 'Pakistan' },
  { id: 591, name: 'Panama' },
  { id: 598, name: 'Papua New Guinea' },
  { id: 600, name: 'Paraguay' },
  { id: 604, name: 'Peru' },
  { id: 608, name: 'Philippines' },
  { id: 612, name: 'Pitcairn' },
  { id: 616, name: 'Poland' },
  { id: 620, name: 'Portugal' },
  { id: 624, name: 'Guinea-Bissau' },
  { id: 626, name: 'Timor-Leste' },
  { id: 630, name: 'Puerto Rico' },
  { id: 634, name: 'Qatar' },
  { id: 638, name: 'Réunion' },
  { id: 642, name: 'Romania' },
  { id: 643, name: 'Russian Federation' },
  { id: 646, name: 'Rwanda' },
  { id: 652, name: 'Saint Barthélemy' },
  { id: 654, name: 'Saint Helena, Ascension and Tristan da Cunha' },
  { id: 659, name: 'Saint Kitts and Nevis' },
  { id: 660, name: 'Anguilla' },
  { id: 662, name: 'Saint Lucia' },
  { id: 663, name: 'Saint Martin (French part)' },
  { id: 666, name: 'Saint Pierre and Miquelon' },
  { id: 670, name: 'Saint Vincent and the Grenadines' },
  { id: 674, name: 'San Marino' },
  { id: 678, name: 'Sao Tome and Principe' },
  { id: 682, name: 'Saudi Arabia' },
  { id: 686, name: 'Senegal' },
  { id: 688, name: 'Serbia' },
  { id: 690, name: 'Seychelles' },
  { id: 694, name: 'Sierra Leone' },
  { id: 702, name: 'Singapore' },
  { id: 703, name: 'Slovakia' },
  { id: 704, name: 'Viet Nam' },
  { id: 705, name: 'Slovenia' },
  { id: 706, name: 'Somalia' },
  { id: 710, name: 'South Africa' },
  { id: 716, name: 'Zimbabwe' },
  { id: 724, name: 'Spain' },
  { id: 728, name: 'South Sudan' },
  { id: 729, name: 'Sudan' },
  { id: 732, name: 'Western Sahara' },
  { id: 740, name: 'Suriname' },
  { id: 744, name: 'Svalbard and Jan Mayen' },
  { id: 748, name: 'Eswatini' },
  { id: 752, name: 'Sweden' },
  { id: 756, name: 'Switzerland' },
  { id: 760, name: 'Syrian Arab Republic' },
  { id: 762, name: 'Tajikistan' },
  { id: 764, name: 'Thailand' },
  { id: 768, name: 'Togo' },
  { id: 772, name: 'Tokelau' },
  { id: 776, name: 'Tonga' },
  { id: 780, name: 'Trinidad and Tobago' },
  { id: 784, name: 'United Arab Emirates' },
  { id: 788, name: 'Tunisia' },
  { id: 792, name: 'Turkey' },
  { id: 795, name: 'Turkmenistan' },
  { id: 796, name: 'Turks and Caicos Islands' },
  { id: 798, name: 'Tuvalu' },
  { id: 800, name: 'Uganda' },
  { id: 804, name: 'Ukraine' },
  { id: 807, name: 'North Macedonia' },
  { id: 818, name: 'Egypt' },
  { id: 826, name: 'United Kingdom of Great Britain and Northern Ireland' },
  { id: 831, name: 'Guernsey' },
  { id: 832, name: 'Jersey' },
  { id: 833, name: 'Isle of Man' },
  { id: 834, name: 'Tanzania, United Republic of' },
  { id: 840, name: 'United States of America' },
  { id: 850, name: 'Virgin Islands (U.S.)' },
  { id: 854, name: 'Burkina Faso' },
  { id: 858, name: 'Uruguay' },
  { id: 860, name: 'Uzbekistan' },
  { id: 862, name: 'Venezuela (Bolivarian Republic of)' },
  { id: 876, name: 'Wallis and Futuna' },
  { id: 882, name: 'Samoa' },
  { id: 887, name: 'Yemen' },
  { id: 894, name: 'Zambia' }];

*/
