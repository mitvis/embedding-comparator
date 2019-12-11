# Embedding Comparator

This repository contains code for the paper:

[Embedding Comparator: Visualizing Differences in Global Structure and Local Neighborhoods via Small Multiples](https://arxiv.org/abs/1912.04853)
<br>
Authors: Angie Boggust, Brandon Carter, Arvind Satyanarayan


### Embedding Comparator Demo

#### Live Demo

A demo of the Embedding Comparator is available at: <http://vis.mit.edu/embedding-comparator/>

#### Run Locally

You can also run the Embedding Comparator demo locally by cloning this repository and starting a web server, e.g., by running `python -m SimpleHTTPServer`, and then opening <http://localhost:8000/index.html>.

The case study demos in the paper (preprocessed data) are included in the `data/` directory of this repository.
Due to file size constraints, raw data for these demos (including original embeddings and words in tsv format) can be downloaded [here](http://vis.mit.edu/embedding-comparator/raw_data/).

We recommend viewing the Embedding Comparator in Google Chrome.


### Adding your own Models

Adding your own models to the Embedding Comparator involves two steps:

1. Preprocess each model with the [preprocess_data.py](preprocess_data.py) Python script (details and example in script docstring).
2. Modify the `DATASET_TO_MODELS` object at the top of [embedding_comparator_react.js](embedding_comparator_react.js), adding the model details and path to the processed data (see examples for demo models).
