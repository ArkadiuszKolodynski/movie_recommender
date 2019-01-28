import pandas as pd
import tensorflow as tf
import itertools
import shutil
import os

from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_curve, auc


def tf_input_fn(X_as_df, y_as_df):
    return tf.estimator.inputs.pandas_input_fn(
        x=X_as_df,
        y=y_as_df,
        shuffle=True
    )


def tf_eval_input_fn(X_as_df, y_as_df):
    return tf.estimator.inputs.pandas_input_fn(
        x=X_as_df,
        y=y_as_df,
        shuffle=False,
    )


if os.path.exists('model'):
    shutil.rmtree('model')

if os.path.exists('exported_model'):
    shutil.rmtree('exported_model')

df = pd.read_csv('hetrec2011-movielens-2k-v2/user_ratedmovies-timestamps.dat',
                 sep="\t",
                 usecols=['userID', 'movieID', 'rating'],
                 header=0)

movie_id = tf.feature_column.categorical_column_with_hash_bucket('movieID', hash_bucket_size=10000)
user_id = tf.feature_column.categorical_column_with_hash_bucket('userID', hash_bucket_size=10000)

wide_columns = [movie_id, user_id]
deep_columns = [
    tf.feature_column.embedding_column(movie_id, dimension=100),
    tf.feature_column.embedding_column(user_id, dimension=100)
]

rating_mean = df['rating'].mean()
print("Rating mean:", rating_mean)
df['rating'] = df['rating'] > rating_mean
df['rating'] = df['rating'].astype(int)
df['userID'] = df['userID'].astype(str)
df['movieID'] = df['movieID'].astype(str)

y = df['rating']
X = df.drop('rating', axis=1)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

model = tf.estimator.DNNLinearCombinedRegressor(
    model_dir="model",
    linear_feature_columns=wide_columns,
    dnn_feature_columns=deep_columns,
    dnn_hidden_units=[100, 50],
    linear_optimizer=tf.train.FtrlOptimizer(learning_rate=0.1),
    dnn_optimizer=tf.train.ProximalAdagradOptimizer(learning_rate=0.1))

model.train(input_fn=tf_input_fn(X_train, y_train))

predictions = model.predict(input_fn=tf_eval_input_fn(X_test, y_test))
predictions_as_list_of_arrays = list(p["predictions"] for p in itertools.islice(predictions, None, None))
predictions_as_list = []
for predictions_as_list_of_arrays_item in predictions_as_list_of_arrays:
    predictions_as_list.append(predictions_as_list_of_arrays_item[0])

fpr, tpr, _ = roc_curve(y_test.values, predictions_as_list)
roc_auc = auc(fpr, tpr)
print('AUC:', roc_auc)

feature_spec = tf.feature_column.make_parse_example_spec(wide_columns + deep_columns)
feature_placeholder = {'movieID': tf.placeholder('string', [1], name='movie_id_placeholder'),
                       'userID': tf.placeholder('string', [1], name='user_id_placehholder')}

serving_input_receiver_fn = tf.estimator.export.build_raw_serving_input_receiver_fn(feature_placeholder)
model.export_savedmodel('exported_model', serving_input_receiver_fn)
