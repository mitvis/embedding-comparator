/* Data and Constants */
const DEFAULT_NUM_NEIGHBORS = 50;
const MAX_NUM_NEIGHBORS = 250;
const DIVERGING_COLORS = d3.schemeRdYlBu[10];
const DIVERGING_SCALE = d3.scaleDiverging(d3.interpolateRdYlBu);
const SEQUENTIAL_COLORS = ["#004616", "#126429", "#2B8238", "#419F44", "#6DB667", "#93CA8B", "#B4DCAB", "#D0EBC8", "#E7F6E1"]
const PERCENT_FORMAT = d3.format('.0%');

const GLOBAL_PROJECTION_PLOTLY_LAYOUT = {
    width: 175,
    height: 175,
    showlegend: false,
    xaxis: {
        showticklabels: false,
        showgrid: false,
        zeroline: false,
        showline: false,
    },
    yaxis: {
        showticklabels: false,
        showgrid: false,
        zeroline: false,
        showline: false,
    },
    margin: {
        l: 0,
        r: 0,
        b: 0,
        t: 0,
    },
    hovermode: 'closest',
};

const GLOBAL_PROJECTION_PLOTLY_CONFIG = {
    displaylogo: false,
    modeBarButtonsToRemove: [
        'toggleSpikelines', 'hoverCompareCartesian', 'hoverClosestCartesian',
        'hoverClosest3d', 'hoverClosestGl2d', 'toImage'],
};


function check_dataset_orders_equal(data1, data2) {
    if (data1 === null || data2 === null || data1.length < 1) {
        throw 'Dataset error';
    }
    if (data1.length != data2.length) {
        throw 'Dataset 1 length != Dataset 2 length';
    }
    for (i = 0; i < data1.length; i++) {
        word1 = data1[i].word;
        word2 = data2[i].word;
        if (word1 != word2) {
            throw 'Error: Datasets must have words in the same order.'
            // TODO: If out of order, handle re-ordering them automatically.
        }
    }
}

function roundSimilarityValue(value) {
    return value.toFixed(2);
}

function compute_iou_similarities(data1, data2, k, metric) {
    to_return = []
    for (i = 0; i < data1.length; i++) {
        word1_neighbors = data1[i]['nearest_neighbors'][metric].knn_ind.slice(0, k);
        word2_neighbors = data2[i]['nearest_neighbors'][metric].knn_ind.slice(0, k);
        intersection = _.intersection(word1_neighbors, word2_neighbors);
        union = _.union(word1_neighbors, word2_neighbors);
        iou = intersection.length / union.length;
        to_return.push(iou);
    }
    return to_return;
}

function sortIdxsBySimilarityValues(similarityValues) {
    // Returns argsort of idxs by similarityValues. First element of returned
    //   array gives idx of the minimum of similarityValues. Last element gives
    //   idx of maximum of similarityValues.
    const sortedIdxsBySimilarity = similarityValues
        .map((val, i) => [val, i])
        .sort(([sim1], [sim2]) => sim1 - sim2)
        .map(([sim, i]) => i);
    return sortedIdxsBySimilarity;
}

function getMaxEuclideanDistanceToNeighbors(datasets) {
    // Given a list of lists of datasetObjects, returns max Euclidean distance
    //   between a point and its neighbor taken over all points/datasets.
    return Math.max.apply(Math, datasets.map(dataset => {
        return Math.max.apply(Math, dataset.map(data => {
            return Math.max(...data.nearest_neighbors.euclidean.knn_dist);
        }));
    }));
}

function getMaxDist(datasetObjects, distanceMetric) {
    if (distanceMetric == 'cosine') {
        return 1;
    }
    else {
        return getMaxEuclideanDistanceToNeighbors([datasetObjects]);
    }
}

function getMinMaxCoords(data) {
    minMaxCoords = {xMax: null, xMin: null, yMax: null, yMin: null}
    for (const datapoint of data) {
        datapointX = datapoint.embedding_pca[0]
        datapointY = datapoint.embedding_pca[1]

        if (minMaxCoords.xMax === null || datapointX > minMaxCoords.xMax) {
            minMaxCoords.xMax = datapointX
        }

        if (minMaxCoords.xMin === null || datapointX < minMaxCoords.xMin) {
            minMaxCoords.xMin = datapointX
        }

        if (minMaxCoords.yMax === null || datapointY > minMaxCoords.yMax) {
            minMaxCoords.yMax = datapointY
        }

        if (minMaxCoords.yMin === null || datapointY < minMaxCoords.yMin) {
            minMaxCoords.yMin = datapointY
        }
    }
    return minMaxCoords;
}


/* Nearset Neighbors Slider */
function createNearestNeighborsSlider(numNearestNeighbors, onChange) {
    d3.select('#num-neighbors-slider > *').remove();

    var numNeighborSlider = d3
        .sliderBottom()
        .min(0)
        .max(MAX_NUM_NEIGHBORS)
        .step(1)
        .width(130)
        .ticks(5)
        .default(numNearestNeighbors)
        .handle(
          d3
            .symbol()
            .type(d3.symbolCircle)
            .size(200)()
        )
        .on('end', val => {
            onChange(val);
        });

    var gNumNeighbors = d3
        .select('div#num-neighbors-slider')
        .append('svg')
        .attr('width', 160)
        .attr('height', 50)
        .append('g')
        .attr('transform', 'translate(12,10)');

    gNumNeighbors.call(numNeighborSlider);
}


/* Similarity Histogram */
function createSimilarityHistogram(values, onBrush, brushSelectedIdxs) {
    d3.selectAll('.similarity-histogram-container > *').remove();

    // maps 1.0 to the [0.9 - 1.0) bucket
    const shrunkValues = values.map(value => {
        return value >= 1.0 ? 0.99 : value;
    })

    // set the dimensions and margins of the graph
    const margin = {top: 20, right: 20, bottom: 20, left: 10},
        width = 180 - margin.left - margin.right,
        height = 170 - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3.select(".similarity-histogram-container")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");

    // X axis: scale and draw:
    var x = d3.scaleLinear()
      .domain([0, 1])
      .range([0, width]);
    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x).ticks(5, '.0%'));

    // set the parameters for the histogram
    var histogram = d3.histogram()
      .value(function(d) { return d; })   // I need to give the vector of value
      .domain(x.domain())  // then the domain of the graphic
      .thresholds(x.ticks(10)); // then the numbers of bins

    // And apply this function to data to get the bins
    var bins = histogram(shrunkValues);
    bins = bins.slice(0, bins.length - 1);

    // Y axis: scale and draw:
    var y = d3.scaleLinear()
      .range([height, 0]);
    // set max y-value to be at least 1
    const y_max = Math.max(1, d3.max(bins, function(d) { return d.length; }));
    y.domain([0, y_max]);

    // append the bar rectangles to the svg element
    svg.selectAll("rect")
      .data(bins)
      .enter()
      .append("rect")
        .attr("x", 1)
        .attr("transform", function(d) { return "translate(" + x(d.x0) + "," + y(d.length) + ")"; })
        .attr("width", function(d) {
            return x(d.x1) - x(d.x0) -1;
        })
        .attr("height", function(d) { return height - y(d.length); })
        .style("fill", (_, i) => DIVERGING_COLORS[i])
        .append('title').text(d => `${d.length} words`);

    var brush = d3.brushX()
                  .extent([[x.range()[0], 0], [x.range()[1], height]]);

    var appendedBrush = svg.append('g')
       .attr('class', 'brush')
       .call(brush);

    if (brushSelectedIdxs !== null) {
        // If current brush selection in the state, set the brush.
        const brushedSimilarityValues = brushSelectedIdxs.map(i => values[i]);
        const brushXMin = x(Math.min(...brushedSimilarityValues));
        const brushXMax = x(Math.max(...brushedSimilarityValues));
        appendedBrush.call(brush.move, [brushXMin, brushXMax]);
    }

    brush.on('end', function() {
        const brushSelectionPixels = d3.event.selection || x.range();
        const brushSelection = brushSelectionPixels.map(x.invert);
        var selectedIdxs;
        if (brushSelection[0] == 0 && brushSelection[1] == 1) {
            selectedIdxs = null;
        }
        else {
            selectedIdxs = [];
            for (let i = 0; i < values.length; i++) {
                let val = values[i];
                if (val >= brushSelection[0] && val <= brushSelection[1]) {
                    selectedIdxs.push(i);
                }
            }
        }
        onBrush(selectedIdxs);
    });

}

function wordsIdxsToWords(wordIdxs, data) {
    return wordIdxs.map(idx => data[idx].word);
}

function getNeighborsForWord(data, wordIdx, distanceMetric, numNearestNeighbors) {
    return data[wordIdx].nearest_neighbors[distanceMetric].knn_ind.slice(0, numNearestNeighbors);
}

function createDominoWordLists(idName, neighbors, color, title, view) {
    d3.selectAll('#' + idName + ' > *').remove();
    const table = d3.select('#' + idName).append('table')

    const full = d3.color(color);
    const fade = full.copy({opacity: 0.4});

    // Create a row in the table
    const table_rows = table.append("tbody")
        .selectAll("tr").data(neighbors)
        .enter().append("tr")

    // Add the title to that row
    table_rows.append('th')
        .attr('class', 'row-header')
        .text(() => neighbors[0].length ? title : `no ${title} words`)

    // Add each neighbor word tag to the row
    table_rows.selectAll("td")
        .data(neighbors[0])
        .enter().append("td")
        .attr("class", function(d) {return `neighbor-${d} word-cell`})
        .style("background-color", fade)
        .text(function(d){return d;})
        .on('mouseover', function(d, i, nodes) {
            view.signal('hover', {text: d}).runAsync();
        });

    table.on('mouseleave', function() {
        view.signal('hover', null).runAsync();
    });

    view.addSignalListener('hover', function(_, d) {
        table.selectAll('td').style('background-color', fade);
        if (d && d.text) table.select(`td.neighbor-${d.text}.word-cell`).style('background-color', full);
    });
}

function createSparkline(containerId, percentage) {
    const container = d3.select('#' + containerId + ' > *').remove();
    const sparklineContainer = d3.selectAll('#' + containerId)
        .append('svg')
        .attr('height', 4)
        .attr('width', '100%');

    /* background sparkline */
    sparklineContainer.append('rect')
        .attr('height', 4)
        .attr('width', '100%')
        .attr('fill', '#ddd')
        .attr('x', 0)
        .attr('y', 0);

    /* forground sparkline */
    sparklineContainer.append('rect')
        .attr('height', 10)
        .attr('width', percentage + '%')
        .attr('fill', '#ccc')
        .attr('x', 0)
        .attr('y', 0);
}

function createDomino(containerClass, dataset1Objects, dataset2Objects,
    wordIdx, distanceMetric, numNearestNeighbors, similarityValues, wordSimilarity) {
    const dataset1Neighbors = getNeighborsForWord(
        dataset1Objects, wordIdx, distanceMetric, numNearestNeighbors);
    const dataset2Neighbors = getNeighborsForWord(
        dataset2Objects, wordIdx, distanceMetric, numNearestNeighbors);

    const intersectionIdxs = [], intersectionWords = [],
        dataset1OnlyIdxs = [], dataset1OnlyWords = [], data1Values = [],
        dataset2OnlyIdxs = [], dataset2OnlyWords = [], data2Values = [];

    for (const idx of dataset1Neighbors) {
        let intersect = false;
        if (dataset2Neighbors.includes(idx)) {
            intersectionIdxs.push(idx);
            intersectionWords.push(dataset1Objects[idx].word);
            intersect = true;
        } else {
            dataset1OnlyIdxs.push(idx);
            dataset1OnlyWords.push(dataset1Objects[idx].word);
        }

        data1Values.push({
            x: dataset1Objects[idx].embedding_pca[0],
            y: dataset1Objects[idx].embedding_pca[1],
            text: dataset1Objects[idx].word,
            color: intersect ? 'intersection' : 'difference',
            model: 'a'
        })
    }

    for (const idx of dataset2Neighbors) {
        let intersect = intersectionIdxs.includes(idx);
        if (!intersect) {
            dataset2OnlyIdxs.push(idx);
            dataset2OnlyWords.push(dataset2Objects[idx].word);
        }

        data2Values.push({
            x: dataset2Objects[idx].embedding_pca[0],
            y: dataset2Objects[idx].embedding_pca[1],
            text: dataset2Objects[idx].word,
            color: intersect ? 'intersection' : 'difference',
            model: 'b'
        });
    }

    // Add the current word to the plots.
    data1Values.push({
        x: dataset1Objects[wordIdx].embedding_pca[0],
        y: dataset1Objects[wordIdx].embedding_pca[1],
        text: dataset1Objects[wordIdx].word,
        color: 'selected_word',
        model: 'a'
    });

    data2Values.push({
        x: dataset2Objects[wordIdx].embedding_pca[0],
        y: dataset2Objects[wordIdx].embedding_pca[1],
        text: dataset2Objects[wordIdx].word,
        color: 'selected_word',
        model: 'b'
    });

    let spec = JSON.parse(JSON.stringify(DEFAULT_VEGA_SPEC));
    spec.data[0].values = data1Values.concat(data2Values);

    d3.select('#' + containerClass + '-plot > *').remove();

    const view = new vega.View(vega.parse(spec))
        .renderer('svg')
        .initialize('#' + containerClass + '-plot')
        .logLevel(vega.Warn);

    view.runAsync();

    createDominoWordLists(containerClass + '-words-intersection', [intersectionWords], CATEGORICAL_COLORS[0], ['common'], view);
    createDominoWordLists(containerClass + '-words-a', [dataset1OnlyWords], CATEGORICAL_COLORS[1],
                         ['unique'], view);
    createDominoWordLists(containerClass + '-words-b', [dataset2OnlyWords], CATEGORICAL_COLORS[1],
                         ['unique'], view);
}

function createScrollWords(wordIdxs, datasetObjects, similarityValues, containerClass, onHover) {
    const words = wordIdxs.map(idx => ({word: datasetObjects[idx].word, score: roundSimilarityValue(similarityValues[idx]), idx: idx}));

    d3.selectAll('.' + containerClass + ' > *').remove();

    const divs = d3.select('.' + containerClass)
        .selectAll('div')
        .data(words)
        .enter()
        .append('div')
            .classed('scroll-text', true)
            .text((d) => `${d.word} (${PERCENT_FORMAT(d.score)})`)
            .style('cursor', 'pointer')
            .on('mouseenter', function(d) {
                onHover(d.idx);
                d3.select(this).classed('scroll-word-active', true);
            })
            .on('mouseleave', function(d) {
                onHover(null);
                d3.select(this).classed('scroll-word-active', false);
            })
            .on('click', function(d) {
                document.getElementById('domino-' + d.idx).focus();
            });

    const svg = divs.append('svg')
        .attr('height', 4)
        .attr('width', '100%');

    svg.append('rect')
        .attr('height', 4)
        .attr('width', '100%')
        .attr('fill', '#f0f0f0');

    svg.append('rect')
        .attr('height', 4)
        .attr('width', d => `${d.score*75}%`)
        .attr('fill', d => DIVERGING_SCALE(d))
        .attr('fill-opacity', 0.5);
}

function createScatterPlotPlotly(plotClass, datasetObjects, similarityScores,
    selectedWordIdx, distanceMetric, numNearestNeighbors, onSelection) {
    Plotly.purge(plotClass);

    const allColors = similarityScores.map(val => DIVERGING_SCALE(val));

    const data = [{
        x: datasetObjects.map(obj => obj.embedding_pca[0]),
        y: datasetObjects.map(obj => obj.embedding_pca[1]),
        text: datasetObjects.map(obj => obj.word),
        mode: 'markers',
        type: 'scatter',
        textposition: 'bottom center',
        marker: {
            size: 4,
            color: allColors,
            opacity: 0.9,
        },
        type: 'scattergl',
        hoverinfo: 'text',
    }];

    Plotly.plot(
        plotClass,
        data,
        GLOBAL_PROJECTION_PLOTLY_LAYOUT,
        GLOBAL_PROJECTION_PLOTLY_CONFIG,
    );

    document.getElementById(plotClass).on('plotly_selected', function(eventData) {
        var selectedIdxs = null;
        if (eventData) {
            selectedIdxs = eventData.points.map(d => d.pointIndex);
        }
        onSelection(selectedIdxs);
    });
}

function updatedScatterPlotSelectedWords(plotClass, datasetObjects,
    similarityScores, selectedWordIdx, distanceMetric, numNearestNeighbors,
    otherModelDatasetObjects) {
    var allColors;
    var allOpacities;
    if (selectedWordIdx === null) {
        allColors = similarityScores.map(val => DIVERGING_COLORS[Math.floor(val*10)]);
        allOpacities = new Array(similarityScores.length).fill(0.8);
    }
    else {
        allColors = new Array(datasetObjects.length).fill('#D3D3D3');
        allOpacities = new Array(similarityScores.length).fill(0.1);
        for (let idx of selectedWordIdx) {
            // Color selected words in black.
            allColors[idx] = '#000000';
            allOpacities[idx] = 0.9;
        }
        if (selectedWordIdx.length == 1) {
            // Only 1 word selected, color neighbors based on intersection or difference.
            const neighborhoodIdxs = datasetObjects[selectedWordIdx].nearest_neighbors[distanceMetric].knn_ind.slice(0, numNearestNeighbors);
            const otherModelNeighborhoodIdxs = otherModelDatasetObjects[selectedWordIdx].nearest_neighbors[distanceMetric].knn_ind.slice(0, numNearestNeighbors);
            for (let idx of neighborhoodIdxs) {
                allOpacities[idx] = 0.9;
                if (otherModelNeighborhoodIdxs.includes(idx)) {
                    // Intersection --> Green
                    allColors[idx] = CATEGORICAL_COLORS[0];
                }
                else {
                    // Difference --> Purple
                    allColors[idx] = CATEGORICAL_COLORS[1];
                }
            }
        }
    }

    const updatedStyle = {
        marker: {
            size: 4,
            color: allColors,
            opacity: allOpacities,
        },
    };

    Plotly.restyle(plotClass, updatedStyle);
}
