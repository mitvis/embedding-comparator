const DATASET_TO_MODELS = {
    sentanalysis: {
        name: 'Transfer Learning for Sentiment Classification',
        models: [
            {
                name: 'FastText Initial',
                path: './data/sentanalysis/initial_fasttext_preprocessed.json',
            },
            {
                name: 'LSTM Fine-tuned',
                path: './data/sentanalysis/lstm_finetuned_preprocessed.json',
            },
        ],
    },
    glove_6b_vs_twitter: {
        name: 'GloVe Pre-trained: Wikipedia/News vs. Twitter',
        models: [
            {
                name: 'Wikipedia/News',
                path: './data/glove_6b_vs_twitter/6B_preprocessed.json',
            },
            {
                name: 'Twitter',
                path: './data/glove_6b_vs_twitter/twitter_preprocessed.json',
            },
        ],
    },
    histwords: {
        name: 'HistWords Diachronic Word Embeddings',
        models: [
            {
                name: 'English 1800-1810',
                path: './data/histwords/1800_preprocessed.json',
            },
            {
                name: 'English 1850-1860',
                path: './data/histwords/1850_preprocessed.json',
            },
            {
                name: 'English 1900-1910',
                path: './data/histwords/1900_preprocessed.json',
            },
            {
                name: 'English 1950-1960',
                path: './data/histwords/1950_preprocessed.json',
            },
            {
                name: 'English 1990-2000',
                path: './data/histwords/1990_preprocessed.json',
            },
        ],
    },
    emojis: {
        name: 'Emoji Representations',
        models: [
            {
                name: 'emoji2vec',
                path: './data/emojis/emoji_words_preprocessed.json',
            },
            {
                name: 'Emoji Image Vectors',
                path: './data/emojis/emoji_imgs_preprocessed.json',
            },
        ],
    },
};

const DISTANCE_METRICS = {
    'cosine': 'Cosine',
    'euclidean': 'Euclidean',
};

const SIMILARITY_METRICS = {
    'jaccard': 'Jaccard Similarity',
};

const DEFAULT_DATASET = 'sentanalysis';
const DEFAULT_DISTANCE_METRIC = 'cosine';
const DEFAULT_SIMILARITY_METRIC = 'jaccard';
const NUM_DOMINOES_PER_COLUMN = 20;


class DatasetSelector extends React.PureComponent {
    constructor(props) {
        super(props);

        this.handleDatasetChange = this.handleDatasetChange.bind(this);
    }

    handleDatasetChange(e) {
        this.props.onChange(e.target.value);
    }

    initialize() {
        $('#dataset-select-dropdown').select2({
            minimumResultsForSearch: -1,
        });

        document.getElementById('dataset-select-dropdown').onchange = this.handleDatasetChange;
    }

    componentDidMount() {
        this.initialize();
    }

    componentDidUpdate(prevProps) {
        this.initialize();
    }

    render() {
        let datasetOptions = [];
        for (const key in this.props.datasetToModels) {
            datasetOptions.push(
                <option value={key} key={key}>
                    {this.props.datasetToModels[key].name}
                </option>);
        }
        return (
            <div className='dataset-section selector'>
                <div className='selection-title'>
                    <div className='selection-title-text'>Dataset</div>
                    <div className='tooltip-control' data-tooltip="Select a dataset. Then select individual models to compare in the Embedding Comparator.">
                        ?
                    </div>
                </div>
                <select id='dataset-select-dropdown' value={this.props.selectedDataset} onChange={this.handleDatasetChange}>
                    {datasetOptions}
                </select>
            </div>
        );
    }
}

class ModelSelector extends React.PureComponent {
    constructor(props) {
        super(props);

        this.handleModelChange = this.handleModelChange.bind(this);
    }

    handleModelChange(e) {
        this.props.onChange(this.props.isModelA, e.target.value);
    }

    initialize() {
        $('#' + this.props.id).select2({
            minimumResultsForSearch: -1,
        });

        document.getElementById(this.props.id).onchange = this.handleModelChange;
    }

    componentDidMount() {
        this.initialize();
    }

    componentDidUpdate(prevProps) {
        this.initialize();
    }

    render() {
        let modelOptions = [];
        for (let i = 0; i < this.props.models.length; i++) {
            const modelName = this.props.models[i].name;
            modelOptions.push(
                <option value={i} key={i}>
                    {modelName}
                </option>);
        }
        return (
            <div className='model-selection'>
                <div className='selection-title'>
                    <div className='selection-title-text'>{this.props.title}</div>
                </div>
                <select id={this.props.id} value={this.props.selectedModelIdx} onChange={this.handleModelChange}>
                    {modelOptions}
                </select>
            </div>
        );
    }
}

class NumNeighborsSelector extends React.PureComponent {
    constructor(props) {
        super(props);

        this.handleNumNeighborsSliderChange = this.handleNumNeighborsSliderChange.bind(this);
    }

    handleNumNeighborsSliderChange(numNearestNeighbors) {
        this.props.onChange(numNearestNeighbors);
    }

    componentDidMount() {
        createNearestNeighborsSlider(
            this.props.numNearestNeighbors,
            this.handleNumNeighborsSliderChange,
        );
    }

    componentDidUpdate(prevProps) {
        createNearestNeighborsSlider(
            this.props.numNearestNeighbors,
            this.handleNumNeighborsSliderChange,
        );
    }

    render() {
        return (
            <div className='nearest-neighbor-selection'>
                <div className='selection-title'>
                    <div className='selection-title-text'>
                        Nearest Neighbors
                    </div>
                    <div className='tooltip-control' data-tooltip="Number of neighbors to define the local neighborhood around each point. Similarity for each word is computed based on the similarity of the neighborhoods from each of the embedding models.">
                        ?
                    </div>
                </div>
                <div className='num-neighbors-container'>
                    <div id='num-neighbors-slider'></div>
                    <div id='num-neighbors-value-continer'></div>
                </div>
            </div>
        );
    }
}

class DistanceMetricSelector extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleDistanceMetricChange = this.handleDistanceMetricChange.bind(this)
    }

    handleDistanceMetricChange(e) {
        this.props.onClick(e.target.value);
    }

    render() {
        let buttons = [];
        for (const key in this.props.options) {
            var className = "btn btn-sm btn-outline-secondary";
            if (key == this.props.distanceMetric) {
                className += " active";
            }
            buttons.push(
                <button
                    value={key}
                    key={key}
                    onClick={this.handleDistanceMetricChange}
                    className={className}>
                    {this.props.options[key]}
                </button>);
        }
        return (
            <div className='distance-metric-selector'>
                <div className='selection-title'>
                    <div className='selection-title-text'>Distance Metric</div>
                    <div className='tooltip-control' data-tooltip="Distance metric for computing the nearest neighbors around each point.">
                        ?
                    </div>
                </div>
                <div className="button-row">
                    {buttons}
                </div>
            </div>
        );
    }
}

class SimilarityMetricSelector extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    render() {
        let buttons = [];
        for (const key in this.props.options) {
            var className = "btn btn-sm btn-outline-secondary";
            if (key == this.props.similarityMetric) {
                className += " active";
            }
            buttons.push(
                <button value={key} key={key} className={className}>
                    {this.props.options[key]}
                </button>);
        }
        return (
            <div className='similarity-metric-selector selector'>
                <div className='selection-title'>
                    <div className='selection-title-text'>
                        Similarity Metric
                    </div>
                    <div className='tooltip-control' data-tooltip="Similarity metric between the local neighboors around a given word. Jaccard is the intersection over union (IOU) similarity which measures the overlap between the two sets.">
                        ?
                    </div>
                </div>
                <div className="button-row">
                    {buttons}
                </div>
            </div>
        );
    }
}

class SimilarityHistogram extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        createSimilarityHistogram(
            this.props.values, this.props.onBrush, this.props.brushedWordIdxs);
    }

    componentDidUpdate(prevProps) {
        createSimilarityHistogram(
            this.props.values, this.props.onBrush, this.props.brushedWordIdxs);
    }

    render() {
        return (
            <div className='histogram'>
                <div className='selection-title'>
                    <div className='selection-title-text'>
                        Similarity Distribution
                    </div>
                </div>
                <div className='similarity-histogram-container'></div>
            </div>
        );
    }
}

class WordDropdown extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleDropdownChange = this.handleDropdownChange.bind(this);
    }

    handleDropdownChange(e) {
        const selectedWordIndexStr = e.target.value;
        const selectedValues = $('#word-selection-dropdown').val();
        var selectedWordIdxs = null;
        if (selectedValues.length > 0) {
            selectedWordIdxs = selectedValues.map(str => parseInt(str, 10));
        }
        this.props.onChange(selectedWordIdxs);
    }

    initialize() {
        $('#word-selection-dropdown').select2({
            width: '100%',
        });

        document.getElementById('word-selection-dropdown').onchange = this.handleDropdownChange;
    }

    clearSelectedWords() {
        $('#word-selection-dropdown').val(null).trigger('change');
    }

    componentDidMount() {
        this.initialize();
    }

    componentDidUpdate(prevProps) {
        if (this.props.selectedWordIdx === null && prevProps.selectedWordIdx !== null) {
            this.clearSelectedWords();
        }
        this.initialize();
    }

    render() {
        let options = [];
        for (let idx = 0; idx < this.props.datasetObjects.length; idx++) {
            const obj = this.props.datasetObjects[idx];
            options.push(
                <option value={idx} key={idx}>
                    {obj.word}
                </option>);
        }

        const currentDropdown = document.getElementById('word-selection-dropdown');
        if (currentDropdown !== null) {
            currentDropdown.onchange = null;
        }

        return (
            <div className='word-selection'>
                <div className='selection-title'>
                    <div className='selection-title-text'>
                        Search for a word
                    </div>
                </div>
                <select id='word-selection-dropdown' multiple='multiple'>
                    {options}
                </select>
            </div>
        );
    }
}

class Plot extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    doPlot() {
        if (this.props.datasetObjects.length == 0) {
            return;
        }
        createScatterPlotPlotly(
            this.props.className + '-plotly',
            this.props.datasetObjects,
            this.props.similarityValues,
            this.props.selectedWordIdx,
            this.props.distanceMetric,
            this.props.numNearestNeighbors,
            this.props.onSelection,
        );
    }

    componentDidMount() {
        this.doPlot();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.activeDominoWordIdx !== this.props.activeDominoWordIdx) {
            updatedScatterPlotSelectedWords(
                this.props.className + '-plotly',
                this.props.datasetObjects,
                this.props.similarityValues,
                ((this.props.activeDominoWordIdx !== null) ? [this.props.activeDominoWordIdx] : null),
                this.props.distanceMetric,
                this.props.numNearestNeighbors,
                this.props.otherModelDatasetObjects,
            );
        }
        else if (prevProps.selectedWordIdx !== this.props.selectedWordIdx) {
            updatedScatterPlotSelectedWords(
                this.props.className + '-plotly',
                this.props.datasetObjects,
                this.props.similarityValues,
                this.props.selectedWordIdx,
                this.props.distanceMetric,
                this.props.numNearestNeighbors,
                this.props.otherModelDatasetObjects,
            );
        }
        else {
            this.doPlot();
        }
    }

    render() {
        return (
            <div className={this.props.className}>
                <div id={this.props.className + '-plotly'}></div>
            </div>
        );
    }
}

class Domino extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    makeDomino() {
        if (this.props.wordIdx === null || this.props.dataset1Objects.length == 0 || this.props.dataset2Objects.length == 0) {
            return;
        }
        createDomino(
            this.props.className,
            this.props.dataset1Objects,
            this.props.dataset2Objects,
            this.props.wordIdx,
            this.props.distanceMetric,
            this.props.numNearestNeighbors,
            this.props.similarityValues,
            this.props.similarityValue,
        );
    }

    makeClickable() {
        const domino = d3.select('.' + this.props.className);
        const wordIdx = this.props.wordIdx;
        const onActiveDominoChange = this.props.onActiveDominoChange;

        domino.style('cursor', 'pointer');
        domino.on('mouseenter', function() {
            onActiveDominoChange(wordIdx);
            d3.select(this).classed('domino-active', true);
        });
        domino.on('mouseleave', function() {
            onActiveDominoChange(null);
            d3.select(this).classed('domino-active', false);
        });
    }

    componentDidMount() {
        this.makeDomino();
        this.makeClickable();
    }

    componentDidUpdate(prevProps) {
        this.makeDomino();
        this.makeClickable();
    }

    render() {
        const roundedSimilarity = PERCENT_FORMAT(this.props.similarityValue);
        return (
            <div className={this.props.className + " domino"} id={this.props.className} tabIndex='-1'>
                <div className='domino-title'>
                    <div className='domino-word'>{this.props.word}</div>
                    <div className='domino-score'>{roundedSimilarity} similar</div>
                </div>
                <div id={this.props.className + '-sparkline'} className='sparkline'></div>
                <div id={this.props.className + '-words-intersection'} className='domino-words-intersection'></div>
                <div id={this.props.className + '-plot'} className='domino-plots'>
                </div>
                <div id={this.props.className + '-not-intersection'} className='domino-not-intersection'>
                    <div id={this.props.className + '-words-a'} className='domino-words-a'></div>
                    <div id={this.props.className + '-words-b'} className='domino-words-b'></div>
                </div>
            </div>
        );
    }
}

class DominoesColumn extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    render() {
        let dominoes = [];
        if (this.props.dataset1Objects.length != 0 && this.props.dataset2Objects.length != 0) {
            // On page load, if datasetObjects not populated yet, no dominoes.
            for (let idx of this.props.wordIdxs) {
                dominoes.push(
                    <Domino
                        key={'domino-' + idx}
                        className={'domino-' + idx}
                        dataset1Objects={this.props.dataset1Objects}
                        dataset2Objects={this.props.dataset2Objects}
                        wordIdx={idx}
                        word={this.props.dataset1Objects[idx].word}
                        similarityValue={this.props.similarityValues[idx]}
                        distanceMetric={this.props.distanceMetric}
                        numNearestNeighbors={this.props.numNearestNeighbors}
                        similarityValues={this.props.similarityValues}
                        onActiveDominoChange={this.props.onActiveDominoChange}
                    />
                );
            }
        }

        const title = this.props.title.split(' ');

        return (
            <div>
                <div className='domino-column-title'><span className='first-word'>{title[0]}</span> {title.slice(1).join(' ')}</div>
                <div className={'domino-column'}>
                    {dominoes}
                </div>
            </div>
        );
    }
}

class ScrollWords extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    makeScrollWords() {
        if (this.props.words === []) { return; }

        createScrollWords(
            this.props.wordsIdxs,
            this.props.datasetObjects,
            this.props.similarityValues,
            this.props.containerClass,
            this.props.onHover,
        );
    }

    componentDidMount() {
        this.makeScrollWords();
    }

    componentDidUpdate(prevProps) {
        this.makeScrollWords();
    }

    render() {
        return (
            <div className={this.props.containerClass}></div>
        );
    }

}

class DominoesContainer extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    render() {
        // Get word idxs for columns of DominoColumns.

        var leastSimilarWordIdxs;
        var mostSimilarWordIdxs;
        var leastSimilarColumnTitle;
        var mostSimilarColumnTitle;

        if (this.props.brushedWordIdxs !== null || this.props.globalPlotSelectedWordIdxs !== null) {
            const selectedIdxs = ((this.props.brushedWordIdxs !== null) ? this.props.brushedWordIdxs : this.props.globalPlotSelectedWordIdxs);
            const sortedIdxBySimilarity = sortIdxsBySimilarityValues(
                this.props.similarityValues);
            const filteredSortedIdxBySimilarity = [];
            for (let idx of sortedIdxBySimilarity) {
                if (selectedIdxs.includes(idx)) {
                    filteredSortedIdxBySimilarity.push(idx);
                }
            }

            const numFirstColumn = Math.min(
                Math.ceil(selectedIdxs.length / 2),
                this.props.numDominoesPerColumn,
            );
            const numSecondColumn = Math.min(
                filteredSortedIdxBySimilarity.length - numFirstColumn,
                this.props.numDominoesPerColumn,
            );
            leastSimilarWordIdxs = filteredSortedIdxBySimilarity.slice(0, numFirstColumn);
            mostSimilarWordIdxs = filteredSortedIdxBySimilarity.reverse().slice(0, numSecondColumn);
            leastSimilarColumnTitle = 'Least Similar Filtered Words';
            mostSimilarColumnTitle = 'Most Similar Filtered Words';
        }
        else if (this.props.selectedWordIdx !== null) {
            const numFirstColumn = Math.ceil(this.props.selectedWordIdx.length / 2);
            leastSimilarWordIdxs = this.props.selectedWordIdx.slice(0, numFirstColumn);
            mostSimilarWordIdxs = this.props.selectedWordIdx.slice(numFirstColumn);
            leastSimilarColumnTitle = 'Selected Words';
            mostSimilarColumnTitle = 'Selected Words';
        }
        else {
            const sortedIdxBySimilarity = sortIdxsBySimilarityValues(
                this.props.similarityValues);
            leastSimilarWordIdxs = sortedIdxBySimilarity.slice(
                0, this.props.numDominoesPerColumn);
            mostSimilarWordIdxs = sortedIdxBySimilarity.reverse().slice(
                0, this.props.numDominoesPerColumn);
            leastSimilarColumnTitle = 'Least Similar Words';
            mostSimilarColumnTitle = 'Most Similar Words';
        }

        return (
            <div className='dominoes-column-container'>
                <div className='dominoes-column-left'>
                    <DominoesColumn
                        wordIdxs={leastSimilarWordIdxs}
                        dataset1Objects={this.props.dataset1Objects}
                        dataset2Objects={this.props.dataset2Objects}
                        distanceMetric={this.props.distanceMetric}
                        numNearestNeighbors={this.props.numNearestNeighbors}
                        similarityValues={this.props.similarityValues}
                        title={leastSimilarColumnTitle}
                        onActiveDominoChange={this.props.onActiveDominoChange}
                    />
                    <ScrollWords
                        wordsIdxs={leastSimilarWordIdxs}
                        datasetObjects={this.props.dataset1Objects}
                        similarityValues={this.props.similarityValues}
                        containerClass={'scroll-words-left'}
                        onHover={this.props.onActiveDominoChange}
                    />
                </div>
                <div className='dominoes-column-right'>
                    <DominoesColumn
                        wordIdxs={mostSimilarWordIdxs}
                        dataset1Objects={this.props.dataset1Objects}
                        dataset2Objects={this.props.dataset2Objects}
                        distanceMetric={this.props.distanceMetric}
                        numNearestNeighbors={this.props.numNearestNeighbors}
                        similarityValues={this.props.similarityValues}
                        title={mostSimilarColumnTitle}
                        onActiveDominoChange={this.props.onActiveDominoChange}
                    />
                    <ScrollWords
                        wordsIdxs={mostSimilarWordIdxs}
                        datasetObjects={this.props.dataset1Objects}
                        similarityValues={this.props.similarityValues}
                        containerClass={'scroll-words-right'}
                        onHover={this.props.onActiveDominoChange}
                    />
                </div>
            </div>
        );
    }
}

class NearestNeighborTable extends React.PureComponent {
    constructor(props) {
        super(props);

        this.handleWordClick = this.handleWordClick.bind(this);
    }

    handleWordClick(selectedWordIdx) {
        this.props.onClick(selectedWordIdx);
    }

    createTable() {
        createNeighborsTable(
            this.props.className,
            this.props.datasetObjects,
            this.props.distanceMetric,
            this.props.selectedWordIdx,
            this.handleWordClick,
        );
    }

    componentDidMount() {
        this.createTable();
    }

    componentDidUpdate(prevProps) {
        this.createTable();
    }

    render() {
        return (
            <div className={this.props.className}></div>
        );
    }
}

class EmbeddingComparator extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            dataset: DEFAULT_DATASET,
            modelAIdx: 0,
            modelBIdx: 1,
            numNearestNeighbors: DEFAULT_NUM_NEIGHBORS,
            distanceMetric: DEFAULT_DISTANCE_METRIC,
            similarityMetric: DEFAULT_SIMILARITY_METRIC,
            selectedWordIdx: null,
            brushedWordIdxs: null,
            globalPlotSelectedWordIdxs: null,
            activeDominoWordIdx: null,
            dataset1Objects: [],
            dataset2Objects: [],
            similarityValues: [],
        };

        this.loadDataset = this.loadDataset.bind(this);
        this.handleDatasetSelectorChange = this.handleDatasetSelectorChange.bind(this);
        this.handleModelChange = this.handleModelChange.bind(this);
        this.handleDistanceMetricChange = this.handleDistanceMetricChange.bind(this);
        this.handleNumNeighborsSliderChange = this.handleNumNeighborsSliderChange.bind(this);
        this.handleDropdownChange = this.handleDropdownChange.bind(this);
        this.handleBrushSelectionChange = this.handleBrushSelectionChange.bind(this);
        this.handleGlobalPlotSelectionChange = this.handleGlobalPlotSelectionChange.bind(this);
        this.handleActiveDominoChange = this.handleActiveDominoChange.bind(this);
    }

    componentDidMount() {
        this.loadDataset();
    }

    async loadDataset() {
        const [dataset1Objects, dataset2Objects] = await Promise.all([
            d3.json(this.props.datasetToModels[this.state.dataset].models[this.state.modelAIdx].path),
            d3.json(this.props.datasetToModels[this.state.dataset].models[this.state.modelBIdx].path),
        ]);
        check_dataset_orders_equal(dataset1Objects, dataset2Objects)

        const newSimilarityValues = compute_iou_similarities(
            dataset1Objects,
            dataset2Objects,
            this.state.numNearestNeighbors,
            this.state.distanceMetric,
        );

        this.setState({
            dataset1Objects: dataset1Objects,
            dataset2Objects: dataset2Objects,
            similarityValues: newSimilarityValues,
        });
    }

    handleDatasetSelectorChange(dataset) {
        this.setState({
            dataset: dataset,
            modelAIdx: 0,
            modelBIdx: 1,
            selectedWordIdx: null,
            brushedWordIdxs: null,
            activeDominoWordIdx: null,
            globalPlotSelectedWordIdxs: null,
        });

        this.loadDataset();
    }

    handleModelChange(isModelA, modelIdx) {
        if (isModelA === null) {
            return;
        }
        if (isModelA) {
            this.setState({
                modelAIdx: modelIdx,
                selectedWordIdx: null,
                brushedWordIdxs: null,
                globalPlotSelectedWordIdxs: null,
                activeDominoWordIdx: null,
            });
        }
        else {
            this.setState({
                modelBIdx: modelIdx,
                selectedWordIdx: null,
                brushedWordIdxs: null,
                globalPlotSelectedWordIdxs: null,
                activeDominoWordIdx: null,
            });
        }

        this.loadDataset();
    }

    handleDistanceMetricChange(distanceMetric) {
        const newSimilarityValues = compute_iou_similarities(
            this.state.dataset1Objects,
            this.state.dataset2Objects,
            this.state.numNearestNeighbors,
            distanceMetric,
        );
        this.setState({
            distanceMetric: distanceMetric,
            similarityValues: newSimilarityValues,
            brushedWordIdxs: null,
        });
    }

    handleNumNeighborsSliderChange(numNearestNeighbors) {
        const clippedNumNearestNeighbors = Math.max(numNearestNeighbors, 1);
        const newSimilarityValues = compute_iou_similarities(
            this.state.dataset1Objects,
            this.state.dataset2Objects,
            clippedNumNearestNeighbors,
            this.state.distanceMetric,
        );
        this.setState({
            numNearestNeighbors: clippedNumNearestNeighbors,
            similarityValues: newSimilarityValues,
            brushedWordIdxs: null,
        });
    }

    handleDropdownChange(selectedWordIdx) {
        this.setState({
            selectedWordIdx: selectedWordIdx,
            brushedWordIdxs: null,
            globalPlotSelectedWordIdxs: null,
        });
    }

    handleBrushSelectionChange(selectedIdxs) {
        this.setState({
            brushedWordIdxs: selectedIdxs,
            selectedWordIdx: null,
            globalPlotSelectedWordIdxs: null,
        });
    }

    handleGlobalPlotSelectionChange(selectedIdxs) {
        this.setState({
            globalPlotSelectedWordIdxs: selectedIdxs,
            brushedWordIdxs: null,
            selectedWordIdx: null,
        });
    }

    handleActiveDominoChange(activeDominoWordIdx) {
        this.setState({
            activeDominoWordIdx: activeDominoWordIdx,
        });
    }

    render() {
        return (
            <div id='embedding-comparator-content'>
                <div className='control-panel'>
                    <div className='parameter-controls'>
                        <DatasetSelector
                            selectedDataset={this.state.dataset}
                            datasetToModels={this.props.datasetToModels}
                            modelAIdx={this.props.modelAIdx}
                            modelBIdx={this.props.modelBIdx}
                            onChange={this.handleDatasetSelectorChange}
                        />
                        <div className='model-selectors-container'>
                            <div id='model-a-props' className='model-props'>
                                <ModelSelector
                                    id='model-a-select-dropdown'
                                    title='Model A'
                                    models={this.props.datasetToModels[this.state.dataset].models}
                                    selectedModelIdx={this.state.modelAIdx}
                                    isModelA={true}
                                    onChange={this.handleModelChange}
                                />

                                <Plot
                                    className={'projector-plot-a-container'}
                                    title={'Projector Plot A'}
                                    datasetObjects={this.state.dataset1Objects}
                                    otherModelDatasetObjects={this.state.dataset2Objects}
                                    selectedWordIdx={this.state.selectedWordIdx}
                                    activeDominoWordIdx={this.state.activeDominoWordIdx}
                                    distanceMetric={this.state.distanceMetric}
                                    similarityValues={this.state.similarityValues}
                                    numNearestNeighbors={this.state.numNearestNeighbors}
                                    onSelection={this.handleGlobalPlotSelectionChange}
                                />
                            </div>

                            <div id='model-b-props' className='model-props'>
                                <ModelSelector
                                    id='model-b-select-dropdown'
                                    title='Model B'
                                    models={this.props.datasetToModels[this.state.dataset].models}
                                    selectedModelIdx={this.state.modelBIdx}
                                    isModelA={false}
                                    onChange={this.handleModelChange}
                                />

                                <Plot
                                    className={'projector-plot-b-container'}
                                    title={'Projector Plot B'}
                                    datasetObjects={this.state.dataset2Objects}
                                    otherModelDatasetObjects={this.state.dataset1Objects}
                                    selectedWordIdx={this.state.selectedWordIdx}
                                    activeDominoWordIdx={this.state.activeDominoWordIdx}
                                    distanceMetric={this.state.distanceMetric}
                                    similarityValues={this.state.similarityValues}
                                    numNearestNeighbors={this.state.numNearestNeighbors}
                                    onSelection={this.handleGlobalPlotSelectionChange}
                                />
                            </div>
                        </div>
                        <div className='similarity'>
                            <div className='metrics'>
                                <NumNeighborsSelector
                                    numNearestNeighbors={this.state.numNearestNeighbors}
                                    onChange={this.handleNumNeighborsSliderChange}
                                />

                                <DistanceMetricSelector
                                    options={this.props.distanceMetricOptions}
                                    distanceMetric={this.state.distanceMetric}
                                    onClick={this.handleDistanceMetricChange}
                                />
                            </div>
                            {/* <SimilarityMetricSelector
                                options={this.props.similarityMetricOptions}
                                similarityMetric={this.state.similarityMetric}
                            /> */}
                            <SimilarityHistogram
                                values={this.state.similarityValues}
                                onBrush={this.handleBrushSelectionChange}
                                brushedWordIdxs={this.state.brushedWordIdxs}
                            />
                        </div>

                        <div className='word-selection-container'>
                            <WordDropdown
                                dataset={this.state.dataset}
                                datasetObjects={this.state.dataset1Objects}
                                onChange={this.handleDropdownChange}
                                selectedWordIdx={this.state.selectedWordIdx}
                            />
                        </div>
                    </div>
                </div>
                <div className='main-panel'>
                    <div className='dominoes-container'>
                        <DominoesContainer
                            dataset1Objects={this.state.dataset1Objects}
                            dataset2Objects={this.state.dataset2Objects}
                            distanceMetric={this.state.distanceMetric}
                            numNearestNeighbors={this.state.numNearestNeighbors}
                            similarityValues={this.state.similarityValues}
                            selectedWordIdx={this.state.selectedWordIdx}
                            brushedWordIdxs={this.state.brushedWordIdxs}
                            globalPlotSelectedWordIdxs={this.state.globalPlotSelectedWordIdxs}
                            numDominoesPerColumn={NUM_DOMINOES_PER_COLUMN}
                            onActiveDominoChange={this.handleActiveDominoChange}
                        />
                    </div>
                </div>
            </div>
        );
    }
}


ReactDOM.render(
    <EmbeddingComparator
        datasetToModels={DATASET_TO_MODELS}
        distanceMetricOptions={DISTANCE_METRICS}
        similarityMetricOptions={SIMILARITY_METRICS}
    />,
    document.getElementById('embedding_comparator_root'),
);
