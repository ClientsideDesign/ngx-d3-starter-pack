import { Component, ViewChild, AfterViewInit, OnDestroy, Input } from '@angular/core';
import { WindowResizeService } from '../../services/window-resize.service';
import * as d3 from '../../../../node_modules/d3';
import { Subscription } from 'rxjs';
import { LabelledChartData } from '../chart-interfaces';

@Component({
  selector: 'app-pie',
  templateUrl: './pie.component.html',
  styleUrls: ['./pie.component.css']
})
export class PieComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chart') chart;
  windowResizeSub: Subscription;
  parentWidth = 0;
  windowWidth = 0;
  @Input() data: LabelledChartData[];

  constructor(private windowResizeService: WindowResizeService) { }

  ngAfterViewInit() {
    this.windowResizeSub = this.windowResizeService.windowSize$.subscribe(resize => {
      if (this.chart && this.chart.nativeElement && this.chart.nativeElement.offsetWidth > 0) {
        if (resize.width !== this.windowWidth) {
          this.windowWidth = resize.width;
          d3.select(this.chart.nativeElement).select('*').remove();
          const checkEmptyInterval = setInterval(() => {
            // Makes sure chart element has been removed before redrawing
            if (this.chart.nativeElement.children.length === 0) {
              this.drawChart(this.chart.nativeElement.offsetWidth / 2, this.chart.nativeElement, this.data);
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

  drawChart(radius, chartWrapper, data) {

    const margin = 30;
    const width = radius * 2;
    const height = radius * 2;

    const svg = d3.select(chartWrapper)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

    const color = d3.schemeTableau10;
    const pie = d3.pie().value((d => d.value));
    const dataReady = pie(data);

    const arcLabel = d3.arc()
      .innerRadius((radius - margin) / 2)
      .outerRadius((radius - margin) / 1.5);

    svg.selectAll('path')
      .data(dataReady)
      .join('path')
      .attr('d', d3.arc()
        .innerRadius(0)
        .outerRadius(radius - margin)
      )
      .attr('fill', (d, i) => color[(i % 10) + 1])
      .attr('stroke', '#ffffff')
      .style('stroke-width', '1px')
      .style('opacity', 0.8);

    svg.append('g')
      .attr('font-family', '"Open Sans", sans-serif')
      .attr('font-size', 12)
      .attr('text-anchor', 'middle')
      .selectAll('text')
      .data(dataReady)
      .join('text')
      .attr('transform', d => 'translate(' + arcLabel.centroid(d) + ')')
      .call(text => text.append('tspan')
        .attr('y', '-0.4em')
        .attr('font-weight', 'bold')
        .text(d => d.data.label))
      .call(text => text.append('tspan')
        .attr('x', 0)
        .attr('y', '0.9em')
        .attr('fill-opacity', 0.7)
        .text(d => d.data.value));
  }

  arcLabel(width, height, svg) {
    const radius = Math.min(width, height) / 2 * 0.8;
    return d3.arc().outerRadius(radius);
  }

}
