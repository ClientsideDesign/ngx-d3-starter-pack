import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, Input } from '@angular/core';
import { WindowResizeService } from '../../services/window-resize.service';
import { select } from 'd3-selection';
import { axisBottom, axisLeft, axisRight } from 'd3-axis';
import { max, extent } from 'd3-array';
import { format } from 'd3-format';
import { scaleLinear, scaleTime } from 'd3-scale';
import { timeFormat, timeParse } from 'd3-time-format';
import { timeWeek } from 'd3-time';
import { schemeTableau10 } from 'd3-scale-chromatic';
import { line, area } from 'd3-shape';
import { Subscription } from 'rxjs';
import { DatedChartDataGroups } from '../chart-interfaces';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-line',
  templateUrl: './line.component.html',
  styleUrls: ['./line.component.css'],
  providers: [CurrencyPipe]
})
export class LineComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chart') chart;
  windowResizeSub: Subscription;
  parentWidth = 0;
  windowWidth = 0;
  dataGroupKeys: string[];
  secondAxis = false;
  @Input() unit: string;
  @Input() data: DatedChartDataGroups;
  @Input() xAxisTitle: string;
  @Input() yAxisTitle: string;
  @Input() widthHeightRatio: number;
  dataDates: Date[];

  constructor(private windowResizeService: WindowResizeService, private currencyPipe: CurrencyPipe) { }

  ngOnInit(): void {
    const parseTime = timeParse('%Y-%m-%d');
    if (this.data) {
      // Dates and data must be of equal length
      this.dataDates = this.data.dates.map(d => parseTime(d));
      this.dataGroupKeys = Object.keys(this.data.groups);
      this.secondAxis = this.dataGroupKeys.map(dataGroupKey => this.data.groups[dataGroupKey].secondAxis).indexOf(true) !== -1;
    }
  }

  ngAfterViewInit() {
    this.windowResizeSub = this.windowResizeService.windowSize$.subscribe(resize => {
      if (this.chart && this.chart.nativeElement && this.chart.nativeElement.offsetWidth > 0) {
        if (resize.width !== this.windowWidth) {
          this.windowWidth = resize.width;
          select(this.chart.nativeElement).select('*').remove();
          const checkEmptyInterval = setInterval(() => {
            // Makes sure chart element has been removed before redrawing
            if (this.chart.nativeElement.children.length === 0) {
              this.drawChart(this.chart.nativeElement.offsetWidth,
                this.chart.nativeElement.offsetWidth * this.widthHeightRatio,
                this.chart.nativeElement as HTMLElement, this.data, this.dataGroupKeys,
                this.dataDates, this.secondAxis, this.xAxisTitle, this.yAxisTitle);
              clearInterval(checkEmptyInterval);
            }
          }, 20);
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.windowResizeSub) {
      this.windowResizeSub.unsubscribe();
    }
  }

  drawChart(width: number, height: number, chartWrapper: HTMLElement, data: DatedChartDataGroups,
            dataGroupKeys: string[], dates: Date[], secondAxis: boolean, xAxisTitle: string, yAxisTitle: string) {

    const color = schemeTableau10;

    const svg = select(chartWrapper)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const margin = { top: 28, right: 40, bottom: 36, left: 40 };

    const xScale = scaleTime()
      .domain(extent(dates))
      .range([margin.left, width - margin.right]);

    const xAxis = g => g
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(axisBottom(xScale).tickSizeOuter(0).tickFormat(timeFormat('%b-%d')).ticks(timeWeek.every(1)));

    svg.append('g')
      .call(xAxis);

    let maxY0: number;
    let maxY1: number;

    if (secondAxis) {
      maxY0 = max(dataGroupKeys.map(dataGroupKey => {
        if (!data.groups[dataGroupKey].secondAxis) {
          return max(data.groups[dataGroupKey].values);
        }
      }));
      maxY1 = max(dataGroupKeys.map(dataGroupKey => {
        if (data.groups[dataGroupKey].secondAxis) {
          return max(data.groups[dataGroupKey].values);
        }
      }));
    } else {
      maxY0 = max(dataGroupKeys.map(dataGroupKey => max(data.groups[dataGroupKey].values)));
    }

    const y0scale = scaleLinear()
      .domain([0, maxY0 + 1])
      .range([height - margin.bottom, margin.top]);

    const y0AxisTicks = y0scale.ticks()
      .filter(tick => Number.isInteger(tick));

    const y0Axis = g => g
      .attr('transform', `translate(${margin.left},0)`)
      .attr('class', 'domain_0')
      .call(axisLeft(y0scale).tickValues(y0AxisTicks).tickFormat(format('d')));

    let y0AxisLabel;

    let y1scale;
    let y1AxisTicks;
    let y1Axis;
    let y1AxisLabel;

    if (secondAxis && maxY1) {
      y1scale = scaleLinear()
        .domain([0, maxY1 + 1])
        .range([height - margin.bottom, margin.top]);

      y1AxisTicks = y1scale.ticks()
        .filter(tick => Number.isInteger(tick));

      y1Axis = g => g
        .attr('transform', `translate(${width - margin.right},0)`)
        .attr('class', 'domain_1')
        .call(axisRight(y1scale).tickValues(y1AxisTicks).tickFormat(format('d')));
    }

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseover', () => {
        this.removeTooltips(svg);
      });

    const lineFx = line()
      .x(d => d[0])
      .y(d => d[1]);

    const areaFx = area()
      .x(d => d[0])
      .y0(height - margin.bottom)
      .y1(d => d[1]);

    const lines = [];


    dataGroupKeys.forEach((dataGroupKey, i) => {
      const values = data.groups[dataGroupKey].values;
      lines.push(values.map((value, j) => {
        if (data.groups[dataGroupKey].secondAxis) {
          return [xScale(dates[j]), y1scale(value)];
        } else {
          return [xScale(dates[j]), y0scale(value)];
        }
      }));
    });

    dataGroupKeys.forEach((dataGroupKey, i) => {
      // Area under lines - must come before axis, lines, points
      svg.append('path')
        .attr('d', areaFx(lines[i]))
        .attr('fill', '#f2f3f4')
        .attr('opacity', 0.5)
        .on('mouseover', () => {
          this.removeTooltips(svg);
        });
    });

    // Add axis

    svg.append('g')
      .call(y0Axis);
    svg.selectAll('.domain_0 .domain')
      .style('stroke', '#000000');
    svg.selectAll('.domain_0 .tick line')
      .style('stroke', '#000000');

    if (secondAxis) {
      svg.append('g')
        .call(y1Axis);
      svg.selectAll('.domain_1 .domain')
        .style('stroke', '#000000');
      svg.selectAll('.domain_1 .tick line')
        .style('stroke', '#000000');
    }

    dataGroupKeys.forEach((dataGroupKey, i) => {
      const values = data.groups[dataGroupKey].values;

      if (data.groups[dataGroupKey].secondAxis) {
        svg.append('text')
          .attr('font-family', '"Open Sans", sans-serif')
          .attr('font-size', 10)
          .attr('y', y1scale(values[values.length - 1]) - 7)
          .attr('x', width - margin.right - 7)
          .text(data.groups[dataGroupKey].label)
          .attr('text-anchor', 'end');
        if (!y1AxisLabel) {
          y1AxisLabel = svg.append('text')
            .attr('font-family', '"Open Sans", sans-serif')
            .attr('font-size', 10)
            .attr('y', 15)
            .attr('x', width)
            .text(() => {
              const label = yAxisTitle ? yAxisTitle : data.groups[dataGroupKey].label;
              const unit = data.groups[dataGroupKey].unit ? ' (' + data.groups[dataGroupKey].unit + ')' : null;
              return label + unit;
            }).attr('text-anchor', 'end');
        }
      } else {
        svg.append('text')
          .attr('font-family', '"Open Sans", sans-serif')
          .attr('font-size', 10)
          .attr('y', y0scale(values[values.length - 1]) - 7)
          .attr('x', width - margin.right - 7)
          .text(data.groups[dataGroupKey].label)
          .attr('text-anchor', 'end');
        if (!y0AxisLabel) {
          y0AxisLabel = svg.append('text')
            .attr('font-family', '"Open Sans", sans-serif')
            .attr('font-size', 10)
            .attr('y', 15)
            .attr('x', 0)
            .text(() => {
              const label = yAxisTitle ? yAxisTitle : data.groups[dataGroupKey].label;
              const unit = data.groups[dataGroupKey].unit ? ' (' + data.groups[dataGroupKey].unit + ')' : null;
              return label + unit;
            })
            .attr('text-anchor', 'start');
        }
      }

      // Lines
      svg.append('path')
        .attr('d', lineFx(lines[i]))
        .attr('stroke', color[i % 10])
        .style('stroke-width', '1px')
        .attr('fill', 'none');
      // Points on line
      lines[i].forEach((point, p) => {
        svg.append('circle')
          .attr('r', 4)
          .attr('cx', point[0])
          .attr('cy', point[1])
          .attr('fill', color[i % 10])
          .on('mouseover', () => {
            this.addTooltip(svg, values[p],
              values[p - 1] ? values[p - 1] : null, point[0], point[1], p === values.length - 1,
              data.groups[dataGroupKey], color[i % 10], data.groups[dataGroupKey].secondAxis, width, margin);
          });
      });
    });

    if (xAxisTitle) {
      svg.append('g')
        .append('text')
        .attr('font-family', '"Open Sans", sans-serif')
        .attr('font-size', 10)
        .attr('x', width / 2 + margin.left / 2)
        .attr('y', height - 6)
        .text(xAxisTitle)
        .attr('text-anchor', 'middle');
    }

  }

  addTooltip(svg, value, prevValue, x, y, lastPoint, groupData, color, secondAxis, width, margin) {

    this.removeTooltips(svg);
    // Make sure any old tooltips have been removed first
    const tooltipGuideline = svg.append('path').attr('class', 'tooltip_guideline');
    const tooltipBackground = svg.append('rect').attr('class', 'tooltip_background');
    const tooltipValue = svg.append('text').attr('class', 'tooltip_value');
    const tooltipPadding = 12;

    tooltipValue
      .style('text-anchor', 'middle')
      .style('fill', '#ffffff')
      .attr('font-family', '"Open Sans", sans-serif')
      .attr('font-size', 10)
      .attr('x', x)
      .text(() => {
        if (groupData.unit === 'GBP') {
          return this.currencyPipe.transform(value, groupData.unit);
        } else {
          return value + (groupData.unit ? ' ' + groupData.label + ' ' + groupData.unit : ' ' + groupData.label);
        }
      })
      .attr('y', y);

    tooltipGuideline
      .attr('stroke', color)
      .attr('stroke-width', '1px')
      .style('stroke-dasharray', ('3, 3'))
      .attr('opacity', 0.8)
      .attr('d', line()([[x, y + 0.5], [secondAxis ? width - margin.right : margin.left, y + 0.5]]));

    if (secondAxis) {
      svg.selectAll('.domain_1 .domain')
        .style('stroke', color);
      svg.selectAll('.domain_1 .tick line')
        .style('stroke', color);
    } else {
      svg.selectAll('.domain_0 .domain')
        .style('stroke', color);
      svg.selectAll('.domain_0 .tick line')
        .style('stroke', color);
    }

    const valueBBox = tooltipValue.node().getBBox();

    const tooltipDimensions = {
      width: valueBBox.width + tooltipPadding,
      height: valueBBox.height + Math.round(tooltipPadding * 0.6)
    };

    if (prevValue) {
      const tooltipChange = svg.append('text')
        .attr('class', 'tooltip_change')
        .style('fill', '#ffffff')
        .attr('font-family', '"Open Sans", sans-serif')
        .style('text-anchor', 'middle')
        .attr('font-size', 10)
        .attr('x', x)
        .text(() => {
          if (value === prevValue) {
            return 'No Change';
          } else {
            const upDownStr = (value / prevValue) < 1 ? 'Down' : 'Up';
            return upDownStr + ' ' + Math.abs(Math.round(((value / prevValue) - 1) * 100)) + '%';
          }
        })
        .attr('y', y + valueBBox.height);
      const changeBBox = tooltipChange.node().getBBox();
      tooltipDimensions.width = max([changeBBox.width, valueBBox.width]) + tooltipPadding;
      tooltipDimensions.height = changeBBox.height + valueBBox.height + Math.round(tooltipPadding * 0.6);
      if (lastPoint) {
        tooltipChange.attr('x', x - (tooltipDimensions.width / 2) + tooltipPadding * 0.5);
        tooltipValue.attr('x', x - (tooltipDimensions.width / 2) + tooltipPadding * 0.5);
      }
    } else {
      // First point
      tooltipValue.attr('x', x + (tooltipDimensions.width / 2) + tooltipPadding * 0.5);
    }
    tooltipBackground
      .attr('x', x - tooltipDimensions.width / 2)
      .attr('y',
        prevValue ? y - tooltipDimensions.height / 2 + tooltipPadding * 0.3 : y - tooltipDimensions.height / 2 - tooltipPadding * 0.3)
      .attr('width', tooltipDimensions.width)
      .attr('height', tooltipDimensions.height)
      .attr('fill', color)
      .attr('opacity', 0.9)
      .attr('stroke', '#ffffff')
      .style('stroke-width', '1px')
      .on('mouseout', () => {
        this.removeTooltips(svg);
      });

    if (lastPoint) {
      tooltipBackground.attr('x', x - tooltipDimensions.width + tooltipPadding / 2);
    }

    if (!prevValue) {
      tooltipBackground.attr('x', x + tooltipPadding / 2);
    }

  }

  removeTooltips(svg) {
    svg.selectAll('.tooltip_value').remove();
    svg.selectAll('.tooltip_change').remove();
    svg.selectAll('.tooltip_background').remove();
    svg.selectAll('.tooltip_guideline').remove();
    svg.selectAll('.domain_0 .domain')
      .style('stroke', '#000000');
    svg.selectAll('.domain_0 .tick line')
      .style('stroke', '#000000');
    svg.selectAll('.domain_1 .domain')
      .style('stroke', '#000000');
    svg.selectAll('.domain_1 .tick line')
      .style('stroke', '#000000');
  }
}
