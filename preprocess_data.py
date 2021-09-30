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
  --embeddings_file=raw_data/glove_6b_vs_twitter/glove_6B_vs_twitter_100d_6B_vectors.tsv \
  --metadata_file=raw_data/glove_6b_vs_twitter/glove_6B_vs_twitter_100d_6B_words.tsv \
  --outfile=data/glove_6b_vs_twitter/6B_preprocessed.json \
  --max_k=250
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import argparse
import json
import logging
import numpy as np
import sklearn.decomposition as decomposition
import sklearn.manifold as manifold
import sklearn.neighbors as neighbors
import umap


DISTANCE_METRICS = ['cosine', 'euclidean']


def _round_list(l, decimals):
    return list(map(lambda x: round(x, decimals), l))


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


def create_nearest_neighbors_dicts(embeddings, max_k, metrics, float_decimals):
    to_return = [
        {metric: None for metric in metrics} for _ in range(len(embeddings))
    ]
    for metric in metrics:
        inds, dists = compute_nearest_neighbors(embeddings, max_k, metric)
        for i, (ind, dist) in enumerate(zip(inds, dists)):
            to_return[i][metric] = {
                'knn_ind': ind.tolist(),
                'knn_dist': _round_list(dist.tolist(), float_decimals),
            }
    return to_return


def create_preprocessed_data(embeddings, words, nn_dicts, embeddings_pca,
                             embeddings_tsne, embeddings_umap, float_decimals):
    to_return = []
    for i, (embedding, word, nn_dict, embedding_pca, embedding_tsne, embedding_umap) in enumerate(
        zip(embeddings, words, nn_dicts, embeddings_pca, embeddings_tsne, embeddings_umap)):
        to_return.append({
            'idx': i,
            'word': word,
            #'embedding': list(embedding),
            'nearest_neighbors': nn_dict,
            'embedding_pca': _round_list(embedding_pca.tolist(), float_decimals),
            'embedding_tsne': _round_list(embedding_tsne.tolist(), float_decimals),
            'embedding_umap': _round_list(embedding_umap.tolist(), float_decimals),
        })
    return to_return


def run_pca(embeddings):
    pca = decomposition.PCA(n_components=2)
    return pca.fit_transform(embeddings)


def run_tsne(embeddings):
    tsne = manifold.TSNE(n_components=2)
    return tsne.fit_transform(embeddings)


def run_umap(embeddings):
    reducer = umap.UMAP()
    return reducer.fit_transform(embeddings)


def write_outfile(outfile_path, preprocessed_data):
    with open(outfile_path, 'w') as f:
        json.dump(preprocessed_data, f, separators=(',', ':'))


def main():
    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser()

    parser.add_argument('--embeddings_file', type=str, required=True,
                        help='Path to embeddings file (tsv).')
    parser.add_argument('--metadata_file', type=str, required=True,
                        help='Path to metadata file (tsv).')
    parser.add_argument('--outfile', type=str, required=True,
                        help='Path to write preprocessed data (json).')
    parser.add_argument('--max_k', type=int, default=250,
                        help='Max value of K for defining local neighborhoods (default = 250).')
    parser.add_argument('--float_decimals', type=int, default=5,
                        help='Number of decimals to round floats in outfile (default = 5).')

    args = parser.parse_args()

    # Load embeddings and words from file.
    embeddings = load_embeddings(args.embeddings_file)
    words = load_words(args.metadata_file)

    # Compute nearest neighbors.
    nn_dicts = create_nearest_neighbors_dicts(
        embeddings, args.max_k, DISTANCE_METRICS, args.float_decimals)
    embeddings_pca = run_pca(embeddings)
    embeddings_tsne = run_tsne(embeddings)
    embeddings_umap = run_umap(embeddings)
    preprocessed_data = create_preprocessed_data(
        embeddings, words, nn_dicts, embeddings_pca, embeddings_tsne,
        embeddings_umap, args.float_decimals,
    )

    # Write preprocessed data to outfile.
    logging.info('Writing data to outfile: %s' % args.outfile)
    write_outfile(args.outfile, preprocessed_data)


if __name__ == '__main__':
    main()
