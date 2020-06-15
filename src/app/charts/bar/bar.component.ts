import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, Input } from '@angular/core';
import { WindowResizeService } from '../../services/window-resize.service';
import * as d3 from '../../../../node_modules/d3';
import { Subscription } from 'rxjs';
import { LabelledChartData } from '../chart-interfaces';

@Component({
  selector: 'app-bar',
  templateUrl: './bar.component.html',
  styleUrls: ['./bar.component.css']
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

  constructor(private windowResizeService: WindowResizeService) { }

  ngOnInit(): void {
    this.dataTotal = this.data.map(datum => datum.value).reduce((total, value) => total + value);
  }

  ngAfterViewInit() {
    this.windowResizeSub = this.windowResizeService.windowSize$.subscribe(resize => {
      if (this.chart && this.chart.nativeElement && this.chart.nativeElement.offsetWidth > 0) {
        if (resize.width !== this.windowWidth) {
          this.windowWidth = resize.width;
          d3.select(this.chart.nativeElement).select('*').remove();
          const checkEmptyInterval = setInterval(() => {
            // Makes sure chart element has been removed before redrawing
            if (this.chart.nativeElement.children.length === 0) {
              this.drawChart(
                this.chart.nativeElement.offsetWidth,
                this.chart.nativeElement.offsetWidth * this.widthHeightRatio, this.chart.nativeElement,
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

  drawChart(width, height, chartWrapper, data, dataTotal, xAxisTitle, yAxisTitle, showPercentage) {

    const margin = { top: 28, right: 20, bottom: 36, left: 40 };

    const x = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([margin.left, width - margin.right])
      .padding(0.1);
    // Data labels must be unique

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .range([height - margin.bottom, margin.top]);

    const xAxis = g => g
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickSizeOuter(0));

    const yAxis = g => g
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(null));

    const color = d3.schemeTableau10;

    const svg = d3.select(chartWrapper)
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
      .attr('x', d => x(d.label))
      .attr('y', d => y(d.value) - 1)
      .attr('height', d => y(0) - y(d.value) + 1)
      .attr('width', x.bandwidth())
      .style('opacity', 0.8);

    if (showPercentage) {
      bars.append('text')
        .attr('fill', 'black')
        .attr('y', d => y(d.value) - 3)
        .attr('x', d => x(d.label) + x.bandwidth() / 2)
        .text(d => (Math.round(d.value / dataTotal * 100) + '%'))
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
