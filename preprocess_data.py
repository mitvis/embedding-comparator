"""Preprocesses embedding data for Embedding Comparator.

Computes the local neighborhoods of each object in the embedding model and PCA
dimensionality reduction of all objects. Writes output as JSON.

The embeddings file should contain the embedding vectors, one embedding per line
and each dimension of embedding tab-separated.
The metadata file should contain the label of each embedding, one per line,
in the same order as embeddings_file.

Note: this script should be used to preprocess each model independently.

Example usage:
python preprocess_data.py \
  --embeddings_file=data/glove_6b_vs_twitter/glove_6B_vs_twitter_100d_6B_vectors.tsv \
  --metadata_file=data/glove_6b_vs_twitter/glove_6B_vs_twitter_100d_6B_words.tsv \
  --outfile=data/glove_6b_vs_twitter/6B_preprocessed.json \
  --max_k=250
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json
import logging
import numpy as np
import sklearn.decomposition as decomposition
import sklearn.neighbors as neighbors
from absl import app
from absl import flags


# Round all floats in JSON dump to 5 decimal places.
json.encoder.FLOAT_REPR = lambda x: format(x, '.5f')

METRICS = ['cosine', 'euclidean']

FLAGS = flags.FLAGS

flags.DEFINE_integer(
    'max_k',
    250,
    'Max value of K for defining local neighborhoods (default = 250)')
flags.DEFINE_string('embeddings_file', None, 'Path to embeddings file (tsv).')
flags.DEFINE_string('metadata_file', None, 'Path to metadata file (tsv).')
flags.DEFINE_string('outfile', None, 'Path to write preprocessed data (json).')


def load_embeddings(filepath):
    embeddings = []
    with open(filepath, 'r') as f:
        for row in f:
            embeddings.append(list(map(float, row.strip().split('\t'))))
    return np.array(embeddings)


def load_words(filepath):
    words = []
    with open(filepath, 'r') as f:
        for row in f:
            words.append(row.strip())
    return words


def compute_nearest_neighbors(embeddings, max_k, metric):
    neigh = neighbors.NearestNeighbors(n_neighbors=max_k, metric=metric)
    neigh.fit(embeddings)
    dist, ind = neigh.kneighbors(return_distance=True)
    return ind, dist


def create_nearest_neighbors_dicts(embeddings, max_k, metrics):
    to_return = [
        {metric: None for metric in metrics} for _ in range(len(embeddings))
    ]
    for metric in metrics:
        inds, dists = compute_nearest_neighbors(embeddings, max_k, metric)
        for i, (ind, dist) in enumerate(zip(inds, dists)):
            to_return[i][metric] = {
                'knn_ind': ind.tolist(),
                'knn_dist': dist.tolist(),
            }
    return to_return


def create_preprocessed_data(embeddings, words, nn_dicts, embeddings_pca):
    to_return = []
    for i, (embedding, word, nn_dict, embedding_pca) in enumerate(
        zip(embeddings, words, nn_dicts, embeddings_pca)):
        to_return.append({
            'idx': i,
            'word': word,
            'embedding': list(embedding),
            'nearest_neighbors': nn_dict,
            'embedding_pca': list(embedding_pca),
        })
    return to_return


def run_pca(embeddings):
    pca = decomposition.PCA(n_components=2)
    return pca.fit_transform(embeddings)


def write_outfile(outfile_path, preprocessed_data):
    with open(outfile_path, 'w') as f:
        json.dump(preprocessed_data, f, separators=(',', ':'))


def main(argv):
    del argv

    logging.basicConfig(level=logging.INFO)

    embeddings_file = FLAGS.embeddings_file
    metadata_file = FLAGS.metadata_file
    outfile_path = FLAGS.outfile
    max_k = FLAGS.max_k

    # Load embeddings and words from file.
    embeddings = load_embeddings(embeddings_file)
    words = load_words(metadata_file)

    # Compute nearest neighbors.
    nn_dicts = create_nearest_neighbors_dicts(embeddings, max_k, METRICS)
    embeddings_pca = run_pca(embeddings)
    preprocessed_data = create_preprocessed_data(
        embeddings, words, nn_dicts, embeddings_pca)

    # Write preprocessed data to outfile.
    logging.info('Writing data to outfile: %s' % outfile_path)
    write_outfile(outfile_path, preprocessed_data)


if __name__ == '__main__':
    flags.mark_flag_as_required('embeddings_file')
    flags.mark_flag_as_required('metadata_file')
    flags.mark_flag_as_required('outfile')
    app.run(main)
