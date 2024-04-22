// main.js
// define color thresholds for the England map (and for the legend)
let englandColorDomain = [200000, 250000, 300000, 350000, 400000, 450000, 500000, 550000]; // between 200k and 550k
let englandColorRange = ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c']; // different shades of blue

let colorScaleEngland = d3.scaleThreshold() // create threshold scale
    .domain(englandColorDomain) // set scale domain to house values
    .range(englandColorRange); // each entry maps to a different shade of blue

// define color thresholds for the London boroughs map (and for the legend)
let londonColorDomain = [400000, 500000, 600000, 700000, 800000, 1000000, 1200000, 1400000, 1600000, 1800000, 2000000]; //between 400k and 2mil (more colours to account for the increase in range / variance
let londonColorRange = ['#eff3ff', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b', '#041945', '#030b1e', '#02050f']; //different shades of blue (contains england colours too however)

let colorScaleBoroughs = d3.scaleThreshold() // create second threshold scale
    .domain(londonColorDomain) // set scale domain to house price vals
    .range(londonColorRange); // each entry maps to different shade of blue

// define the mercator projection (for england map)
let englandProjection = d3.geoMercator()
    .center([0, 53]) // england coordinates
    .scale(5000) //size
    .translate([1300 / 2, 1000 / 2]); // moves position it's rendered on the svg canvas

let englandPathGenerator = d3.geoPath().projection(englandProjection); // creates path generator (what draws the GeoJSON outline) with previously defined projection

// define the mercator projection (for london map)
let boroughsProjection = d3.geoMercator()
    .center([0, 51.5]) // london coordinates
    .scale(70000) // size (found to be the best through trial and error)
    .translate([1700 / 2, 900 / 2]); //position on svg

let boroughsPathGenerator = d3.geoPath().projection(boroughsProjection); // creates second path generator (what draws the GeoJSON outline) with previously defined projection

// load the JSON data file containing house prices (combined-data.json)
d3.json('combined-data.json').then(function(housePrices) {
    let englandPriceMap = new Map(housePrices.filter(d => d && d["2023"]).map(d => [d.Column1, d["2023"]])); // filters data from "2023" column of json file, then adds to new map (column 1 is the region name, then the price from the year column)
    let londonPriceMap = new Map(housePrices.filter(d => d && d["2017"]).map(d => [d.Column1, d["2017"]])); // does the same as above but with the 2017 london borough data

    Promise.all([ // wait for json data to load (this is done because they are long files). errors when you try and draw before it's not loaded properly (asynchronous)
        d3.json('england.json'),
        d3.json('london_boroughs.json')
    ]).then(function(data) { // assigns to data in order called (so data[0] is england.json and data[1] is london_boroughs.json)
        const [geojsonDataEngland, geojsonDataLondon] = data; // assigns above line to actual names

        let svgEngland = d3.select('#england-map'); // element defined in HTML
        let svgBoroughs = d3.select('#boroughs-map'); // defined in HTML
        let tooltip = d3.select('#tooltip'); // defined in HTML

        // render england map
        svgEngland.selectAll('path') // initially empty
            .data(geojsonDataEngland.features) // get GeoJSON data
            .enter().append('path')
            .attr('d', englandPathGenerator)
            .attr('fill', d => colorScaleEngland(englandPriceMap.get(d.properties.EER13NM))) // use colours defined earlier to draw map based on house price
            .attr('class', 'country') //css
            .call(bindTooltip, tooltip, englandPriceMap); // for displaying the house prices when a user hovers over a region

        // render london boroughs map
        svgBoroughs.selectAll('path')
            .data(geojsonDataLondon.features) // get GeoJSON data
            .enter().append('path')
            .attr('d', boroughsPathGenerator)
            .attr('fill', d => colorScaleBoroughs(londonPriceMap.get(d.properties.name))) // use colours defined earlier to draw map based on house price
            .attr('class', 'borough')
            .call(bindTooltip, tooltip, londonPriceMap); // for displaying the house prices when a user hovers over a region

        // legends
        createLegend(svgEngland, colorScaleEngland, englandColorDomain, 20); // 20 pixels to the right
        createLegend(svgBoroughs, colorScaleBoroughs, londonColorDomain, 20);
    });
});

// function to make the region name and prices appear when a user hovers over (tooltip)
function bindTooltip(selection, tooltip, priceMap) {
    selection
        .on('mouseover', function(event, d) { // when the mouse is over a region:
            d3.selectAll('path').classed('dimmed', true); // dim all the other regions (to highlight the current one)
            d3.select(this).classed('dimmed', false).classed('active', true); // make current region active
            const price = priceMap.get(d.properties.name || d.properties.EER13NM); // get region average house price
            const formattedPrice = price ? `£${price.toLocaleString()}` : 'N/A'; // makes sure there's a £ before the price val, and adds commas every thousand
            tooltip.style('visibility', 'visible') // makes tooltip visible
                .html(`${d.properties.name || d.properties.EER13NM}<br>${formattedPrice}`) //displays
                .style('top', (event.pageY - 10) + 'px') // position (just above of cursor)
                .style('left', (event.pageX + 10) + 'px'); // position (just left of cursor)
        })
        .on('mousemove', function(event) { // makes sure that tooltip follows mouse
            tooltip.style('top', (event.pageY - 10) + 'px')
                .style('left', (event.pageX + 10) + 'px');
        })
        .on('mouseout', function() { // gets rid of tooltip when mouse no longer hovering over region
            d3.selectAll('path').classed('dimmed', false).classed('active', false);
            tooltip.style('visibility', 'hidden');
        });
}

// toggle button between england regions and london boroughs (GeoJSON maps)
document.getElementById('toggleButton').addEventListener('click', function() { // listen for click
    let englandMap = d3.select('#england-map'); // renders england map
    let boroughsMap = d3.select('#boroughs-map'); // renders london boroughs map
    let englandHidden = englandMap.classed('hidden'); // check to see if england map is hidden
    englandMap.classed('hidden', !englandHidden); // if click and england map is hidden, unhide it
    boroughsMap.classed('hidden', englandHidden); // london borough visibility if the opposite
});

// initially hide the london boroughs map
document.addEventListener('DOMContentLoaded', function() {
    d3.select('#boroughs-map').classed('hidden', true);
});

// code to display the legend on both maps
function createLegend(svg, colorScale, domain, xOffset) {
    const legendHeight = 200; // height of the legend
    const legendWidth = 20; // width of the colour bars in the legend

    const yScale = d3.scaleLinear() // vertical legend
        .domain([d3.min(domain), d3.max(domain)]) // input values
        .range([legendHeight, 0]);

    const legend = svg.append('g') // append the legend to the svg container containing the map
        .attr('class', 'legend')
        .attr('transform', `translate(${xOffset}, 50)`); // position (on the left)

    legend.selectAll('rect')  // create coloured rectangles using the colour scales / thresholds created for the choropleth
        .data(colorScale.range().map(color => {
            const d = colorScale.invertExtent(color);
            if (d[0] == null) d[0] = yScale.domain()[0];
            if (d[1] == null) d[1] = yScale.domain()[1];
            return d;
        }))
        .enter().append('rect') // create rectangle for each price range
        .attr('x', 0)
        .attr('y', d => yScale(d[1])) // y scale (vertical)
        .attr('width', legendWidth)
        .attr('height', d => yScale(d[0]) - yScale(d[1]))
        .attr('fill', d => colorScale(d[0]));

    // show the scale values (price intervals)
    const yAxis = d3.axisRight(yScale) // display on the right of coloured rectangles
        .tickSize(5) // tick size
        .tickValues(colorScale.domain()) // ensures colour alignment with the price values
        .tickFormat(d => `£${d3.format(".2s")(d)}`); // adds £ and .2s rounds it

    legend.append('g') // adds scale values next to the legend
        .attr('class', 'legend-axis')
        .attr('transform', `translate(${legendWidth}, 0)`)
        .call(yAxis);
}

