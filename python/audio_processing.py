import time
import subprocess
import random
import sys
sys.path.append("../python")
from HTK import HTKFile
import numpy as np
import os
import wave
import contextlib
#from sklearn.manifold import TSNE
from sklearn.decomposition import PCA
from MulticoreTSNE import MulticoreTSNE as TSNE
from pydub import AudioSegment
import csv
#from minisom import MiniSom
import sompy
import umap
from sklearn.cluster import KMeans


smilextract = '../opensmile-2.3.0/SMILExtract'

color_dict = {
    "0": "blue",
    "1": "green",
    "2": "yellow",
    "3": "red",
    "4": "purple",
    "5": "orange",
    "6": "teal",
    "7": "brown"
}

def update_config(config_file, segment_size, step_size):
    print(config_file)
    with open(config_file, "r", encoding='windows-1252') as f:
        lines = f.readlines()
    with open(config_file, "w", encoding='windows-1252') as f:
        for line in lines:
            frameSize = 0.025
            frameStep = 0.01
            if line.startswith('frameSize'):
                new_line = "frameSize = " + segment_size
                f.write(new_line)
                f.write("\n")
            elif line.startswith('frameStep'):
                new_line = "frameStep = " + step_size + "0"
                f.write(new_line)
                f.write("\n")
            else:
                f.write(line)
    
def main(session_key, config_file, segment_size, step_size):    
    # Get audiofilename
    audio_dir = "static/uploads/" + session_key + "/"
    for file_name in os.listdir(audio_dir):
        if file_name[0] != ".":
            audio_name = file_name
            break
    # Get full path
    audio_path = audio_dir + file_name

    # If mp3, convert to wav
    if audio_path[-3:] == "mp3":
        wav_audio = AudioSegment.from_mp3(audio_path)
        audio_path = audio_path[:-3:] + "wav" # set new audio_path
        wav_audio.export(audio_path, format="wav")
    
    # Get metadata
    audio_duration = len(AudioSegment.from_wav(audio_path))

    # If duration is longer than 1 hour, segment into chunks
    if audio_duration > 3600000:
        chunks = []
        chunk_start_time = 0
        while chunk_start_time * 1000 < audio_duration:
            subprocess.call(["sox", audio_path, audio_dir + str(int((chunk_start_time / 3600)+1)) + ".wav", "trim", str(chunk_start_time), "3600"])
            chunks.append(audio_dir + str(int((chunk_start_time / 3600)+1)) + ".wav")
            chunk_start_time += 3600
    else:
        chunks = [audio_path]


    # Create dir for ouput and set filenames
    output_dir = "static/data/" + session_key + "/"
    subprocess.call(["mkdir", output_dir])
    output_path = output_dir + audio_name.split(".")[0] + ".mfcc.htk"

    # Prepend path to config file
    config_file = '../opensmile-2.3.0/config/' + config_file

    # Update config file with segment- and steplength, divided by 1000 to get second-format
    update_config(config_file, str(segment_size/1000), str(step_size/1000))

    # Run opensmile to output features in output dir
    subprocess.call([smilextract, "-C", config_file, "-I", audio_path, "-O", output_path])

    # Read file, and return formatted data
    htk_reader = HTKFile()
    htk_reader.load(output_path)
    result = np.array(htk_reader.data)
    
    # Run data through t-SNE
    tsne = TSNE(n_components=2, perplexity=25)#, random_state=None)
    Y1 = convert_range(tsne.fit_transform(result))
    print("t-SNE done")

    # Run data through PCA
    pca = PCA(n_components=2)
    Y2 = convert_range(pca.fit_transform(result))
    print("PCA done")

    # Run data through SOM
    som = True
    if som:
        # som = MiniSom(10, 10, len(result[0]), sigma=0.3, learning_rate=0.1)
        # som.train_random(result, 2000)
        # print(np.array([np.array(som.winner(i)) for i in range(len(result))]) )
        # Y3 = convert_range(np.array([np.array(som.winner(i)) for i in range(len(result))]))
        # print("SOM done")
        print("SOM-grid-size: ", int(len(result)**0.5))
        mapsize = [int(len(result)**0.5), int(len(result)**0.5)]
        if mapsize[0] > 100:
            mapsize = [100, 100]
        som = sompy.SOMFactory.build(result, mapsize, mask=None, mapshape='planar', lattice='rect', normalization='var', initialization='pca', neighborhood='gaussian', training='batch', name='sompy')  # this will use the default parameters, but i can change the initialization and neighborhood methods
        som.train(n_job=1, verbose='info')  # verbose='debug' will print more, and verbose=None wont print anything
        #som_output = np.array([np.array([0, int(bmu)]) if int(bmu) < 10 else np.array([int(str(bmu)[0]), int(str(bmu)[1])]) for bmu in som._bmu[0]])
        som_output = np.array(np.array([np.array(np.unravel_index(int(bmu), (mapsize[0],mapsize[0]))) for bmu in som._bmu[0]]))
        Y3 = convert_range(som_output)
        print("SOM done")
    else:
        Y3 = convert_range(np.array([np.array([random.randint(-50, 50), random.randint(-50, 50)]) for i in range(len(Y2))]))

    # Run data through UMAP
    run_umap = True
    if run_umap:
        Y4 = convert_range(umap.UMAP().fit_transform(result))
        print("UMAP done")
    else:
        Y4 = convert_range(np.array([np.array([random.randint(-50, 50), random.randint(-50, 50)]) for i in range(len(Y2))]))

    # K-means on raw features
    kmeans2 = KMeans(n_clusters=2, random_state=0).fit(result)
    print("kmeans2 done")
    kmeans3 = KMeans(n_clusters=3, random_state=0).fit(result)
    print("kmeans3 done")
    kmeans4 = KMeans(n_clusters=4, random_state=0).fit(result)
    print("kmeans4 done")
    kmeans5 = KMeans(n_clusters=5, random_state=0).fit(result)
    print("kmeans5 done")
    kmeans6 = KMeans(n_clusters=6, random_state=0).fit(result)
    print("kmeans6 done")
    kmeans7 = KMeans(n_clusters=7, random_state=0).fit(result)
    print("kmeans7 done")
    kmeans8 = KMeans(n_clusters=8, random_state=0).fit(result)
    print("kmeans8 done")

    # Format t-SNE output to correct dictionary format
    data = []
    i = 0
    for coord1, coord2, coord3, coord4, cluster_index2, cluster_index3, cluster_index4, cluster_index5, cluster_index6, cluster_index7, cluster_index8 in zip(Y1, Y2, Y3, Y4, kmeans2.labels_, kmeans3.labels_, kmeans4.labels_, kmeans5.labels_, kmeans6.labels_, kmeans7.labels_, kmeans8.labels_):
        data.append({
            "id":i, 
            "tsneX":float(coord1[0]), 
            "tsneY":float(coord1[1]), 
            "pcaX":float(coord2[0]), 
            "pcaY":float(coord2[1]), 
            "somX":float(coord3[0]), 
            "somY":float(coord3[1]), 
            "umapX":float(coord4[0]), 
            "umapY":float(coord4[1]), 
            "start":int(i*step_size), 
            "active":1, 
            "color":"black", 
            "kcolor2":color_dict[str(cluster_index2)], 
            "kcolor3":color_dict[str(cluster_index3)], 
            "kcolor4":color_dict[str(cluster_index4)], 
            "kcolor5":color_dict[str(cluster_index5)], 
            "kcolor6":color_dict[str(cluster_index6)], 
            "kcolor7":color_dict[str(cluster_index7)], 
            "kcolor8":color_dict[str(cluster_index8)]})
        #data.append({"id":i, "tsneX":random.randint(1,99), "tsneY":random.randint(1,99), "pcaX":random.randint(1,99), "pcaY":random.randint(1,99), "start":int(i*step_size), "active":1, "color":"black"})
        i+=1

    # Save data as csv to be able to load later
    keys = data[0].keys()
    with open(output_dir + "data.csv", 'w') as output_file:
        dict_writer = csv.DictWriter(output_file, keys)
        dict_writer.writeheader()
        dict_writer.writerows(data)

    # Save metadata as csv to be able to load later
    metadata = [{"audio_duration":audio_duration, "audio_path":audio_path, "segment_size":segment_size, "step_size":step_size, "chunks":",".join(chunks)}]
    keys = metadata[0].keys()
    with open(output_dir + "metadata.csv", 'w') as output_file:
        dict_writer = csv.DictWriter(output_file, keys)
        dict_writer.writeheader()
        dict_writer.writerows(metadata)

    #return data, audio_duration

def retrain(valid_points, session_key, old_session_key, segment_size, step_size):    
    # Get audiofilename
    audio_dir = "static/uploads/" + session_key + "/"
    for file_name in os.listdir(audio_dir):
        if file_name[0] != ".":
            audio_name = file_name
            break
    # Get full path
    audio_path = audio_dir + file_name

    # If mp3, convert to wav
    if audio_path[-3:] == "mp3":
        wav_audio = AudioSegment.from_mp3(audio_path)
        audio_path = audio_path[:-3:] + "wav" # set new audio_path
        wav_audio.export(audio_path, format="wav")
    
    # Get metadata
    audio_duration = len(AudioSegment.from_wav(audio_path))

    # Create dir for ouput and set filenames
    output_dir = "static/data/" + session_key + "/"
    subprocess.call(["mkdir", output_dir])

    # Copy audio
    path_to_old_htk = "static/data/" + old_session_key + "/" + audio_name.split(".")[0] + ".mfcc.htk"
    path_to_new_htk = "static/data/" + session_key + "/" + audio_name.split(".")[0] + ".mfcc.htk"
    subprocess.call(["cp", path_to_old_htk, path_to_new_htk])

    # Read file, and return formatted data
    htk_reader = HTKFile()
    htk_reader.load(path_to_old_htk)
    result = np.array(htk_reader.data)
    new_result = []
    
    valid_points_indexes = [i[0] for i in valid_points[1:]]
    start_times = [i[1] for i in valid_points[1:]]
    colors = [i[2] for i in valid_points[1:]]
    for i, line in enumerate(result):
        if i in valid_points_indexes:
            new_result.append(line)

    new_result = np.array(new_result)
    
    # Run data through t-SNE
    tsne = TSNE(n_components=2, perplexity=25)#, random_state=None)
    Y1 = convert_range(tsne.fit_transform(new_result))
    print("t-SNE done")

    # Run data through PCA
    pca = PCA(n_components=2)
    Y2 = convert_range(pca.fit_transform(new_result))
    print("PCA done")

    # Run data through SOM
    som = True
    if som:
        # som = MiniSom(25, 25, len(result[0]), sigma=0.3, learning_rate=0.1)
        # som.train_random(new_result, 1000)
        # Y3 = convert_range(np.array([np.array(som.winner(i)) for i in range(len(new_result))]))
        print("SOM-grid-size: ", int(len(result)**0.5))
        mapsize = [int(len(result)**0.5), int(len(result)**0.5)]
        som = sompy.SOMFactory.build(result, mapsize, mask=None, mapshape='planar', lattice='rect', normalization='var', initialization='pca', neighborhood='gaussian', training='batch', name='sompy')  # this will use the default parameters, but i can change the initialization and neighborhood methods
        som.train(n_job=1, verbose='info')  # verbose='debug' will print more, and verbose=None wont print anything
        #som_output = np.array([np.array([0, int(bmu)]) if int(bmu) < 10 else np.array([int(str(bmu)[0]), int(str(bmu)[1])]) for bmu in som._bmu[0]])
        som_output = np.array(np.array([np.array(np.unravel_index(int(bmu), (int(len(result)**0.5),int(len(result)**0.5)))) for bmu in som._bmu[0]]))
        Y3 = convert_range(som_output)
        print("SOM done")
    else:
        Y3 = convert_range(np.array([np.array([random.randint(-50, 50), random.randint(-50, 50)]) for i in range(len(Y2))]))

    # Run data through UMAP
    run_umap = True
    if run_umap:
        Y4 = convert_range(umap.UMAP().fit_transform(new_result))
        print("UMAP done")
    else:
        Y4 = convert_range(np.array([np.array([random.randint(-50, 50), random.randint(-50, 50)]) for i in range(len(Y2))]))

    # K-means on raw features
    kmeans2 = KMeans(n_clusters=2, random_state=0).fit(result)
    print("kmeans2 done")
    kmeans3 = KMeans(n_clusters=3, random_state=0).fit(result)
    print("kmeans3 done")
    kmeans4 = KMeans(n_clusters=4, random_state=0).fit(result)
    print("kmeans4 done")
    kmeans5 = KMeans(n_clusters=5, random_state=0).fit(result)
    print("kmeans5 done")
    kmeans6 = KMeans(n_clusters=6, random_state=0).fit(result)
    print("kmeans6 done")
    kmeans7 = KMeans(n_clusters=7, random_state=0).fit(result)
    print("kmeans7 done")
    kmeans8 = KMeans(n_clusters=8, random_state=0).fit(result)
    print("kmeans8 done")

    # Format t-SNE output to correct dictionary format
    data = []
    i = 0
    for coord1, coord2, coord3, coord4, start_time, color, cluster_index2, cluster_index3, cluster_index4, cluster_index5, cluster_index6, cluster_index7, cluster_index8 in zip(Y1, Y2, Y3, Y4, start_times, colors, kmeans2.labels_, kmeans3.labels_, kmeans4.labels_, kmeans5.labels_, kmeans6.labels_, kmeans7.labels_, kmeans8.labels_):
        data.append({
            "id":i, 
            "tsneX":float(coord1[0]), 
            "tsneY":float(coord1[1]), 
            "pcaX":float(coord2[0]), 
            "pcaY":float(coord2[1]), 
            "somX":float(coord3[0]), 
            "somY":float(coord3[1]), 
            "umapX":float(coord4[0]), 
            "umapY":float(coord4[1]),
            "start":start_time, 
            "active":1, 
            "color":color, 
            "kcolor2":color_dict[str(cluster_index2)], 
            "kcolor3":color_dict[str(cluster_index3)], 
            "kcolor4":color_dict[str(cluster_index4)], 
            "kcolor5":color_dict[str(cluster_index5)], 
            "kcolor6":color_dict[str(cluster_index6)], 
            "kcolor7":color_dict[str(cluster_index7)], 
            "kcolor8":color_dict[str(cluster_index8)]})
        #data.append({"id":i, "tsneX":random.randint(1,99), "tsneY":random.randint(1,99), "pcaX":random.randint(1,99), "pcaY":random.randint(1,99), "start":int(i*step_size), "active":1, "color":"black"})
        i+=1

    # # Format t-SNE output to correct dictionary format
    # data = []
    # i = 0


    # for coord1, coord2, coord3, coord4, start_time, color in zip(Y1, Y2, Y3, Y4, start_times, colors):
    #     data.append({"id":i, "tsneX":float(coord1[0]), "tsneY":float(coord1[1]), "pcaX":float(coord2[0]), "pcaY":float(coord2[1]), "somX":float(coord3[0]), "somY":float(coord3[1]), "umapX":float(coord4[0]), "umapY":float(coord4[1]), "start":start_time, "active":1, "color":color})
    #     #data.append({"id":i, "tsneX":random.randint(1,99), "tsneY":random.randint(1,99), "pcaX":random.randint(1,99), "pcaY":random.randint(1,99), "start":int(i*step_size), "active":1, "color":"black"})
    #     i+=1

    # Save data as csv to be able to load later
    keys = data[0].keys()
    with open(output_dir + "data.csv", 'w') as output_file:
        dict_writer = csv.DictWriter(output_file, keys)
        dict_writer.writeheader()
        dict_writer.writerows(data)

    # Save metadata as csv to be able to load later
    metadata = [{"audio_duration":audio_duration, "audio_path":audio_path, "segment_size":segment_size, "step_size":step_size}]
    keys = metadata[0].keys()
    with open(output_dir + "metadata.csv", 'w') as output_file:
        dict_writer = csv.DictWriter(output_file, keys)
        dict_writer.writeheader()
        dict_writer.writerows(metadata)

    #return data, audio_duration

def convert_range(Y):
    # print(Y.shape)
    # return Y
    new_range = (80 - (-80))  
    Y_x = Y[:,0]
    
    
    old_range_x = (max(Y_x) - min(Y_x))  
    new_Y_x = (((Y_x - min(Y_x)) * new_range) / old_range_x) + (-80)

    Y_y = Y[:,1]
    old_range_y = (max(Y_y) - min(Y_y))  
    new_Y_y = (((Y_y - min(Y_y)) * new_range) / old_range_y) + (-80)
    
    return np.array((new_Y_x, new_Y_y)).T