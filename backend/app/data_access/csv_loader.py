import pandas as pd


def load_nodes(csv_path):
    return pd.read_csv(csv_path)


def load_edges(csv_path):
    return pd.read_csv(csv_path)


def save_nodes(df, csv_path):
    df.to_csv(csv_path, index=False)


def save_edges(df, csv_path):
    df.to_csv(csv_path, index=False)