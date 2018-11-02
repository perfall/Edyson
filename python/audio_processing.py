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
from minisom import MiniSom    

smilextract = '../opensmile-2.3.0/SMILExtract'

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
                new_line = "frameStep = " + step_size
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
    Y1 = tsne.fit_transform(result)
    print("t-SNE done")

    # Run data through PCA
    pca = PCA(n_components=2)
    Y2 = pca.fit_transform(result)
    print("PCA done")
    print("Y2: ", Y2)

    # Run data through SOM
    som = False
    if som:
        som = MiniSom(25, 25, len(result[0]), sigma=0.3, learning_rate=0.1)
        som.train_random(result, 1000)
        Y3 = np.array([np.array(som.winner(i)) for i in range(len(result))])
        print("Y3: ", Y3)
        print("SOM done")
    else:
        Y3 = np.array([np.array([random.randint(-50, 50), random.randint(-50, 50)]) for i in range(len(Y2))])

    # Format t-SNE output to correct dictionary format
    data = []
    i = 0
    for coord1, coord2, coord3 in zip(Y1, Y2, Y3):
        data.append({"id":i, "tsneX":float(coord1[0]), "tsneY":float(coord1[1]), "pcaX":float(coord2[0]), "pcaY":float(coord2[1]), "somX":float(coord3[0]), "somY":float(coord3[1]), "start":int(i*step_size), "active":1, "color":"black"})
        #data.append({"id":i, "tsneX":random.randint(1,99), "tsneY":random.randint(1,99), "pcaX":random.randint(1,99), "pcaY":random.randint(1,99), "start":int(i*step_size), "active":1, "color":"black"})
        i+=1

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
    Y1 = tsne.fit_transform(new_result)
    print("t-SNE done")

    # Run data through PCA
    pca = PCA(n_components=2)
    Y2 = pca.fit_transform(new_result)
    print("PCA done")

    # Format t-SNE output to correct dictionary format
    data = []
    i = 0

    print("HEREsadsadsadsad")
    print(len(start_times))
    print(len(colors))
    print(len(Y1))

    for coord1, coord2, start_time, color in zip(Y1, Y2, start_times, colors):
        data.append({"id":i, "tsneX":float(coord1[0]), "tsneY":float(coord1[1]), "pcaX":float(coord2[0]), "pcaY":float(coord2[1]), "start":start_time, "active":1, "color":color})
        #data.append({"id":i, "tsneX":random.randint(1,99), "tsneY":random.randint(1,99), "pcaX":random.randint(1,99), "pcaY":random.randint(1,99), "start":int(i*step_size), "active":1, "color":"black"})
        i+=1

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
