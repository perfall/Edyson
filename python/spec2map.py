 # -*- coding: utf-8 -*-
#import matplotlib
# from matplotlib import pyplot as plt
import numpy as np
import os
import sys
from PIL import Image
from sklearn.manifold import TSNE
from sklearn.decomposition import PCA
import random
import unicodedata
import time
import pickle
#import pygame as pg
from pydub import AudioSegment
from shutil import copyfile
#from som import SOM # File som.py should be in folder

class Cluster:

    def __init__(self):
        self.color_index = {}
        self.work_dir = None
        self.sample_rate = None

    def load_data(self, spec_path, sound_path, subset):
        """
        Load spectrograms from dir and convert to array.
        Load labels.
        Assign colors.
        Return data with labels.
        """
        X_vectors = []
        X_labels = []
        X_intensities = []
        for file in os.listdir(spec_path):
            file = unicodedata.normalize('NFC', file)
            if file.startswith('.'): # Avoid reading unwanted hidden files
                continue
            if random.randint(1, 100) > subset: # Only use a subset of the data if subset < 100
                continue
            current_spectrogram = Image.open(spec_path + file)
            X_vectors.append(np.array(current_spectrogram.getdata()))
            #print(np.array(current_spectrogram.getdata()))
            X_labels.append(file[:-4]) # Remember labels without ".png"
            X_intensities.append(np.mean(np.array(current_spectrogram.getdata())))

        # # Temporary
        # with open("/Users/perfall/Desktop/vec_decoded_specs.tsv", "r") as file:
        #     for line in file:
        #         X_vectors.append(np.array([float(i) for i in line.split()]))

        # with open("/Users/perfall/Desktop/lab_decoded_specs.tsv", "r") as file:
        #     for line in file:
        #         X_labels.append(line.strip())


        # Set sample rate
        #self.sample_rate = AudioSegment.from_mp3(sound_path + os.listdir(sound_path)[0]).frame_rate
        self.sample_rate = 44000

        # Load colors, then assign colors to labels
        # colors = {}
        # with open("colors.txt", "r") as file:
        #     for line in file:
        #         colors[line.split()[0]] = line.split()[1]
        # for label in X_labels:
        #     prefix = label[:2] # Colors are assigned based on the first two symbols of label
        #     try:
        #         self.color_index[label] = colors[prefix]
        #     except:
        #         self.color_index[label] = "black" # If label not assigned a color return blue
        return np.array(X_vectors), X_labels, X_intensities
        
    def grid_size(self, n):
        """
        Calculate optimal grid-size for SOM, as close to square form as possible.
        """
        root = int(abs(n**0.5))
        if root**2 == n:
            return root, root
        return root, root+1

    def train_som(self, spec_path, sound_path, subset):
        """
        Train the SOM on the vectors and get each vectors bmu (best matching unit).
        """
        
        X_vectors, X_labels, X_intensities = self.load_data(spec_path, sound_path, subset)
        rows, columns = self.grid_size(len(X_labels)) # Calculate grid-size
        
        som = SOM(rows, columns, len(X_vectors[0]), 200, alpha=0.3)
        som.train(X_vectors)
        
        coords = som.map_vects(X_vectors) # get coordinates
        x_coords = [c1 for c1, c2 in coords]
        y_coords = [c2 for c1, c2 in coords]
        self.plot(X_labels, x_coords, y_coords, coords)
        
    def train_tsne(self, spec_path, sound_path, subset):
            X_vectors, X_labels, X_intensities = self.load_data(spec_path, sound_path, subset)
            tsne = TSNE(n_components=2, perplexity=25, random_state=None)
            Y = tsne.fit_transform(X_vectors)

            # Create csv-file for external plotting
            path = spec_path + "/../" + "output.csv"
            f = open(path, "w")
            f.write("x,y,label,intensity,fname\n")
            for x, y, label, intensity in zip(Y[:, 0], Y[:, 1], X_labels, X_intensities):
                line = ",".join([str(x), str(y), label.split("_")[0], str(intensity), label])
                f.write(line)
                f.write("\n")
            f.close()

            #self.plot(X_labels, Y[:, 0], Y[:, 1], Y)

    # def plot(self, labels, x_coords, y_coords, coords):
    #     """
    #     Plot and play corresponding sound when hovering over datapoint.
    #     """
        
    #     # Dump session for later in given directory, also add colors and load script for independent use
    #     pickle.dump((labels, x_coords, y_coords, coords), open(self.work_dir + "pickled_map_" + str(subset) + "%.txt", "wb" ))
    #     copyfile("colors.txt", self.work_dir + "colors.txt")
    #     copyfile("load.py", self.work_dir + "load.py")

        
    #     # Initialize audio engine
    #     for f in os.listdir(sound_path): # Avoid hidden files
    #         if not f.startswith('.'): 
    #             sample_rate = AudioSegment.from_mp3(sound_path + f).frame_rate
    #             break
    #     pg.init()
        
        # def onhover(event):
        #     # Play sound when hover
        #     x = event.xdata
        #     y = event.ydata
        #     sound_label = labels[self.calc_nearest_point((x, y), coords)]
        #     sound_file = sound_path + '/' + str(sound_label) + '.wav'
        #     print("Playing: ", sound_label)
        #     pg.mixer.Sound(sound_file).play()
        #     time.sleep(0.01) # Small pause to avoid crashing

        # # Create plot and add datapoints
        # fig = plt.figure()
        # ax = fig.add_subplot(111)
        # for label, x, y in zip(labels, x_coords, y_coords):
        #     ax.scatter(x, y, color=self.color_index[label], label=label[:2], s=100, alpha=0.4) # plot
        #     #ax.annotate(label[:2], xy=(x, y), xytext=(0, 0), textcoords='offset points') # Uncomment for textlabels on plot
        # if sound_path:
        #     fig.canvas.mpl_connect('motion_notify_event', onhover)
        # ax.grid(True)
        # plt.show()

    def calc_nearest_point(self, node, nodes):
        nodes = np.asarray(nodes)
        deltas = nodes - node
        dist_2 = np.einsum('ij,ij->i', deltas, deltas)
        return np.argmin(dist_2)

if __name__ == '__main__':
    alg, work_dir, subset = sys.argv[1], sys.argv[2], 100
    spec_path, sound_path = work_dir + "/spectrograms/", work_dir + "/sounds/"
    cluster = Cluster()
    cluster.work_dir = work_dir +"/"
    if len(sys.argv) == 4:
        subset = int(sys.argv[3])
    if alg == "som":
        cluster.train_som(spec_path, sound_path, subset)
    elif alg == "tsne":
        cluster.train_tsne(spec_path, sound_path, subset)
    else:
        print("Incorrect argument, try 'som' or 'tsne'.")
    print("Done")