import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, Input } from '@angular/core';
import { WindowResizeService } from '../../services/window-resize.service';
import { select } from 'd3-selection';
import { axisBottom, axisLeft } from 'd3-axis';
import { max } from 'd3-array';
import { scaleLinear, scaleBand } from 'd3-scale';
import { schemeTableau10 } from 'd3-scale-chromatic';
import { Subscription } from 'rxjs';
import { LabelledChartData } from '../chart-interfaces';
import { PercentPipe } from '@angular/common';

@Component({
  selector: 'app-bar',
  templateUrl: './bar.component.html',
  styleUrls: ['./bar.component.css'],
  providers: [PercentPipe]
})
export class BarComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chart') chart;
  windowResizeSub: Subscription;
  parentWidth = 0;
  windowWidth = 0;
  dataTotal = 0;
  @Input() data: LabelledChartData[];
  @Input() xAxisTitle: string;
  @Input() yAxisTitle: string;
  @Input() showPercentage: boolean;
  @Input() widthHeightRatio: number;

  constructor(private windowResizeService: WindowResizeService, private percentPipe: PercentPipe) { }

  ngOnInit(): void {
    this.dataTotal = this.data.map(datum => datum.value).reduce((total, value) => total + value);
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
              this.drawChart(
                this.chart.nativeElement.offsetWidth,
                this.chart.nativeElement.offsetWidth * this.widthHeightRatio, this.chart.nativeElement as HTMLElement,
                this.data, this.dataTotal, this.xAxisTitle, this.yAxisTitle, this.showPercentage);
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

  drawChart(width: number, height: number, chartWrapper: HTMLElement, data: LabelledChartData[],
            dataTotal: number, xAxisTitle: string, yAxisTitle: string, showPercentage: boolean) {

    const margin = { top: 28, right: 20, bottom: 36, left: 40 };

    const x = scaleBand()
      .domain(data.map(d => d.label))
      .range([margin.left, width - margin.right])
      .padding(0.1);
    // Data labels must be unique!

    const y = scaleLinear()
      .domain([0, max(data, (d: LabelledChartData) => d.value)])
      .range([height - margin.bottom, margin.top]);

    const xAxis = g => g
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(axisBottom(x).tickSizeOuter(0));

    const yAxis = g => g
      .attr('transform', `translate(${margin.left},0)`)
      .call(axisLeft(y).ticks(null));

    const color = schemeTableau10;

    const svg = select(chartWrapper)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('font-family', '"Open Sans", sans-serif')
      .attr('font-size', '10')
      .attr('text-anchor', 'end');

    const bars = svg.selectAll('g')
      .data(data)
      .join('g');

    bars.append('rect')
      .attr('fill', (d, i) => color[i % 10])
      .attr('x', (d: LabelledChartData) => x(d.label))
      .attr('y', (d: LabelledChartData) => y(d.value) - 1)
      .attr('height', (d: LabelledChartData) => y(0) - y(d.value) + 1)
      .attr('width', x.bandwidth())
      .style('opacity', 0.8);

    if (showPercentage) {
      bars.append('text')
        .attr('fill', 'black')
        .attr('y', (d: LabelledChartData) => y(d.value) - 3)
        .attr('x', (d: LabelledChartData) => x(d.label) + x.bandwidth() / 2)
        .text((d: LabelledChartData) => this.percentPipe.transform(d.value / dataTotal))
        .attr('text-anchor', 'middle')
        .attr('font-weight', '600');
    }

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

    if (yAxisTitle) {
      svg.append('g')
        .append('text')
        .attr('font-family', '"Open Sans", sans-serif')
        .attr('font-size', 10)
        .attr('y', 15)
        .attr('x', 0)
        .text(yAxisTitle)
        .attr('text-anchor', 'start');
    }

    svg.append('g')
      .call(xAxis);

    svg.append('g')
      .call(yAxis);

  }
}
