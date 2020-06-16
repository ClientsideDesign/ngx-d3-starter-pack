import { Component, ViewChild, AfterViewInit, OnDestroy, Input } from '@angular/core';
import { WindowResizeService } from '../../services/window-resize.service';
import * as d3 from 'd3';
import * as venn from 'venn.js';
import { Subscription } from 'rxjs';
import { VennDiagramSet } from '../chart-interfaces';

@Component({
  selector: 'app-venn',
  templateUrl: './venn.component.html',
  styleUrls: ['./venn.component.css']
})
export class VennComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chart') chart;
  windowResizeSub: Subscription;
  parentWidth = 0;
  windowWidth = 0;
  @Input() data: VennDiagramSet[];
  @Input() widthHeightRatio: number;

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
              this.drawChart(this.chart.nativeElement.offsetWidth, this.chart.nativeElement.offsetWidth * this.widthHeightRatio,
                this.chart.nativeElement as HTMLElement, this.data);
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

  drawChart(width: number, height: number, chartWrapper: HTMLElement, setData: VennDiagramSet[]) {
    const color = d3.schemeTableau10;

    const svg = d3.select(chartWrapper)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseover', () => {
        this.removeTooltips(chartWrapper, setData);
      });

    const chart = venn.VennDiagram().width(width).height(height);
    svg.datum(setData).call(chart);

    d3.select(chartWrapper)
      .selectAll('.venn-circle path')
      .style('fill-opacity', 0.8)
      .style('fill', (d, i) => color[i + 1])
      .style('mix-blend-mode', 'multiply');

    d3.select(chartWrapper).selectAll('g.venn-intersection')
      .on('mouseover', (d, i, paths) => {
        if (!d3.select('#tooltip_' + i).node()) {
          const label = d3.select(paths[i]).select('.label');
          this.addTooltip(chartWrapper, svg, setData, d, i, d3.select(paths[i]), label.attr('x'), label.attr('y'));
        }
      });

    d3.select(chartWrapper).selectAll('g.venn-circle')
      .on('mouseover', (d, i, paths) => {
        this.removeTooltips(chartWrapper, setData);
      });

    d3.select(chartWrapper)
      .selectAll('.venn-area')
      .each((d, i, areas) => {
        const valueLabel = d3.select(areas[i]).select('text');
        const dataSet = d as VennDiagramSet;
        valueLabel.text('test')
          .attr('font-size', dataSet.label ? '10px' : '12px')
          .attr('font-weight', dataSet.label ? 'bold' : 'normal')
          .text(dataSet.label ? dataSet.label : dataSet.size)
          .style('fill', dataSet.label ? '#000000' : '#ffffff');
        if (dataSet.label) {
          const valueLabelBBox = (valueLabel.node() as SVGGraphicsElement).getBBox();
          const descriptionLabel = d3.select(areas[i]).append('text');
          descriptionLabel
            .text(dataSet.size)
            .attr('x', valueLabel.attr('x'))
            .attr('dy', valueLabel.attr('dy'))
            .attr('y', parseInt(valueLabel.attr('y'), 10) + valueLabelBBox.height)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', 'normal');
        }
      });
  }

  addTooltip(chartWrapper, svg, setData, d, i, area, x, y) {

    // Make sure any old tooltips / styling has been removed first
    this.removeTooltips(chartWrapper, setData);

    venn.sortAreas(d3.select(chartWrapper), d);

    area.select('path').style('stroke-opacity', 1)
      .style('stroke-width', 2)
      .style('stroke', '#ffffff')
      .style('mix-blend-mode', 'normal');

    const tooltipBackground = svg.append('rect').attr('class', 'tooltip_background').attr('id', 'tooltip_' + i);
    const tooltipLabel = svg.append('text').attr('class', 'tooltip_label');
    const tooltipValue = svg.append('text').attr('class', 'tooltip_value');
    const tooltipPadding = 12;

    const parentSets = setData.filter(setDatum => setDatum.sets.length === 1 && d.sets.indexOf(setDatum.sets[0]) !== -1)
      .sort((a, b) => {
        return b.size - a.size;
      });

    const leadSet = parentSets.shift();
    const otherSets = parentSets.map(parentSet => parentSet.label);

    tooltipLabel
      .style('text-anchor', 'middle')
      .style('fill', '#ffffff')
      .attr('font-family', '"Open Sans", sans-serif')
      .attr('font-size', '10px')
      .text(() => Math.round(d.size / leadSet.size * 100) + '% of ' + leadSet.label + ' are also ')
      .attr('transform', 'translate(' + x + ',' + y + ')');

    const labelBBox = tooltipLabel.node().getBBox();

    tooltipValue
      .style('text-anchor', 'middle')
      .style('fill', '#ffffff')
      .attr('font-family', '"Open Sans", sans-serif')
      .attr('font-size', '10px')
      .text(otherSets.join(' and '))
      .attr('transform', 'translate(' + x + ',' + y + ')')
      .attr('y', labelBBox.height);

    const valueBBox = tooltipValue.node().getBBox();

    const tooltipDimensions = {
      width: d3.max([labelBBox.width, valueBBox.width]) + tooltipPadding,
      height: labelBBox.height + valueBBox.height + tooltipPadding * 0.6
    };

    tooltipBackground
      .attr('width', tooltipDimensions.width)
      .attr('height', tooltipDimensions.height)
      .attr('transform', 'translate(' + x + ',' + y + ')')
      .attr('fill', 'rgb(78, 121, 167)')
      .attr('opacity', 0.9)
      .attr('stroke', '#ffffff')
      .style('stroke-width', '1px')
      .attr('x', tooltipDimensions.width * -0.5)
      .attr('y', (tooltipDimensions.height * -0.5) + (tooltipPadding * 0.3));
  }

  removeTooltips(chartWrapper, setData) {
    venn.sortAreas(d3.select(chartWrapper), setData[setData.length - 1]); // Reset order
    d3.select(chartWrapper)
      .selectAll('g.venn-area')
      .select('path')
      .style('stroke', null)
      .style('stroke-width', null)
      .style('stroke-opacity', null)
      .style('mix-blend-mode', (d: VennDiagramSet) => {
        return d.label ? 'multiply' : 'normal';
      });
    d3.select(chartWrapper).selectAll('.tooltip_value').remove();
    d3.select(chartWrapper).selectAll('.tooltip_label').remove();
    d3.select(chartWrapper).selectAll('.tooltip_background').remove();
  }

}
